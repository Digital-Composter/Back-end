const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const supabase = require("../config/connection");
const { generateAccessToken } = require("../middleware/jsonwebtoken");
const getPWMOutput = require("../functions/fuzzyinferencesystem");
const { response, getDate, calculateAverage, distributeValues } = require("../functions/function");

//non routes function
async function sendEmail(to, username) {
    // Create a transporter object using SMTP transport
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Your email address from environment variables
            pass: process.env.EMAIL_PASS,  // Your email password from environment variables
        },
    });

    // Modern and Minimalist HTML Content
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; color: #333;">
            <header style="padding-bottom: 20px; border-bottom: 1px solid #ddd;">
                <h1 style="font-size: 24px; font-weight: bold; color: #2C3E50; text-align: center;">Dicompos</h1>
            </header>
            <main style="padding-top: 20px;">
                <p style="font-size: 18px; color: #2C3E50;">Dear ${username},</p>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">
                    Your compost has reached its maturation phase. Therefore, you're free to stop the composting process.
                </p>
            </main>
            <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
                <p style="font-size: 14px; color: #777;">Best regards,<br>Dicompos</p>
            </footer>
        </div>
    `;

    // Setup email data
    let mailOptions = {
        from: `"Dicompos" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Your Compost is Done!',
        html: htmlContent,
    };

    // Send email with defined transport object
    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent to %s: %s', username, info.messageId);
    } catch (error) {
        console.error('Error sending email to %s: %s', username, error);
    }
}

async function resetRealtimeExceptLatest(id) {
    // Delete all data from the realtime table
    await supabase
    .from('realtime')
    .delete()
    .lt('id', id)
}

async function resetRealtimeTable() {
    // Delete all data from the realtime table
    await supabase
    .from('realtime')
    .delete()
    .gt('id', 0)
}

async function resetRecordsTable() {
    // Delete all data from the realtime table
    await supabase
    .from('records')
    .delete()
    .gt('id', 0)
}

//routes function
// Function to register a new user
async function register(req, res) {
    const { Username, Email, Password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(Email)) {
        return response(400, null, "Invalid email address", res);
    }

    try {
        const hashedPassword = await bcrypt.hash(Password, 10);

        await supabase.auth.signUp({
            email: Email,
            password: hashedPassword
          })

        const { data, error } = await supabase
            .from('users')
            .insert([
                { Username, Email, Password: hashedPassword }
            ])
            .select();

        if (error) {
            return response(500, null, error.message, res);
        } else {
            return response(200, data, "Registration complete", res);
        }   
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to log in an existing user
async function logIn(req, res) {
    const { Email, Password } = req.body;

    try {
        await supabase.auth.signInWithPassword({
            email: Email,
            password: Password
          })

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('Email', Email);

        if (error) {
            return response(500, null, error.message, res);
        }

        if (data.length === 0) {
            return response(401, null, "Invalid email address", res);
        }

        // Compare the hashed password
        const match = await bcrypt.compare(Password, data[0].Password);
        if (!match) {
            return response(401, null, "Invalid password", res);
        }

        const token = generateAccessToken(data[0].Username);

        const responseData = {
            username: data[0].Username,
            email: data[0].Email,
            token: token
        };
        
        return response(200, responseData, "Login successful", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to get user details
async function getUser(req, res) {
    try {
        const { data, error } = await supabase
        .from('users')
        .select('*');

        if (error) {
            return response(500, null, error.message, res);
        }

        return response(200, data, "Data retreived", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to get realtime data
async function getRealtime(req, res) {
    try {
        const { data, error } = await supabase
            .from('realtime')
            .select('*')
            .order('inserted_at', { ascending: false }) // Sort by newest timestamp first
            .limit(1); // Limit to only one row

        if (error) {
            return response(500, null, error.message, res);
        }

        return response(200, data, "Latest data retrieved", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to insert realtime data
async function postRealtime(req, res) {
    let id;
    let increment;

    const { 
        temp,
        moist,
        ph,
        phase 
    } = req.body;

    try {
        // Fetch current data from the 'realtime' table
        const { data: realtimeData, error: realtimeError } = await supabase
            .from('realtime')
            .select('*');

        if (realtimeError) {
            return response(500, null, realtimeError.message, res);
        }

        // Check for "Maturasi" phase in the existing data
        const maturationData = realtimeData.filter(record => record.phase === 'Maturasi');

        if (maturationData.length === 3) {
            // Fetch user data from the 'users' table
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('Username, Email');

            if (userError) {
                console.error('Error fetching user data:', userError.message);
                return response(500, null, userError.message, res);
            }

            // Send the email to all users
            for (const user of userData) {
                await sendEmail(user.Email, user.Username);
            }
        }

        // Prepare to insert new data
        increment = realtimeData.length + 1;
        id = increment;

        const { data, error } = await supabase
            .from('realtime')
            .insert([{
                id,
                temp,
                moist,
                ph,
                phase
            }])
            .select();

        if (error) {
            return response(500, null, error.message, res);
        }

        return response(200, data, "Data inserted", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to insert records data
async function postRecords(req, res) {
    let id;
    let increment;

    const { 
        log 
    } = req.body;

    if (log == "MCU"){
        try {
            // Fetch data from realtime table
            const { data: realtimeData, error: realtimeError } = await supabase
                .from('realtime')
                .select('*');
    
            if (realtimeError) {
                return response(500, null, realtimeError.message, res);
            }
    
            // Check if there are more than 864 records
            if (realtimeData.length >= 864) {
                // Calculate average values
                const averageValues = calculateAverage(realtimeData);
    
                const { data: idData, error: idError } = await supabase
                .from('records')
                .select('*');
    
                if (idError) {
                    return response(500, null, idError.message, res);
                }
    
                increment = idData.length + 1;
                id = increment;
    
                const { data, error } = await supabase
                .from('records')
                .insert([
                    {
                        id,
                        temp: averageValues.temp,
                        moist: averageValues.moist,
                        ph: averageValues.ph,
                    }
                ])
                .select();
    
                if (error) {
                    return response(500, null, error.message || "Insert error", res);
                }
    
                await resetRealtimeExceptLatest(realtimeData.length);
                const { data: resetData, error: resetError } = await supabase
                .from('realtime')
                .update([
                {
                    id: 1,
                }
                ])
                .eq('id', realtimeData.length)
                .select();
    
                if (resetError) {
                    return response(500, null, error.message, res);
                }
    
                return response(200, data, "Data inserted", res);
            }
            return response(200, null, "Not enough data", res);
    
        } catch (error) {
            return response(500, null, error.message || "Unknown error", res);
        }
    } else {
        return response(400, null, "Log false", res);
    }
}

// Function to get records data
async function getRecords(req, res) {
    try {
        // Fetch content of records table
        const { data, error } = await supabase
            .from('records')
            .select('*');

        if (error) {
            return response(500, null, error.message, res);
        }

        // Return content of records table
        return response(200, data, "Data retrieved", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to get control details
async function getControl(req, res) {
    try {
        const { data, error } = await supabase
            .from('control')
            .select('*')

        if (error) {
            return response(500, null, error.message, res);
        }

        return response(200, data, "Control settings retrieved", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to edit control details
async function putControlTemp(req, res) {

    try {
        const { 
            mesophilic_temp, 
            thermophilic_temp
        } = req.body;

        const values = distributeValues(mesophilic_temp, thermophilic_temp)

        const { data, error } = await supabase
            .from('control')
            .update({
                ...values,
                updated_at: getDate()
            })
            .eq('id', 1)
            .select(); // Assuming there's only one row in the control table

        if (error) {
            return response(500, null, error.message, res);
        } else {
            return response(200, data, "Setting updated", res);
        }  
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to edit control details
async function putControlMoist(req, res) {
    try {
        const { 
            moist_min, 
            moist_max
        } = req.body;

        const { data, error } = await supabase
            .from('control')
            .update({
                moist_min,
                moist_max,
                updated_at: getDate()
            })
            .eq('id', 1)
            .select(); // Assuming there's only one row in the control table

        if (error) {
            return response(500, null, error.message, res);
        } else {
            return response(200, data, "Setting updated", res);
        }  
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to activate device
async function activateDevice(req, res) {
    try {
        const { data: stateData, error: stateError } = await supabase
            .from('state')
            .select('*');

        if (stateError) {
            return response(500, null, stateError.message, res);
        }

        if (stateData[0].state !== 0) {
            return response(400, null, "Device is already activated", res);
        }

        const state = 1;

        const { data, error } = await supabase
            .from('state')
            .update({
                state,
                date: getDate()
            })
            .eq('id', 1)
            .select();

        if (error) {
            return response(500, null, error.message, res);
        }

        resetRealtimeTable();
        resetRecordsTable();
        return response(200, data, "State updated", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to deactivate device
async function deactivateDevice(req, res) {
    try {
        const { data: stateData, error: stateError } = await supabase
            .from('state')
            .select('*');

        if (stateError) {
            return response(500, null, stateError.message, res);
        }

        if (stateData[0].state !== 1) {
            return response(400, null, "Device is already deactivated", res);
        }

        const state = 0;

        const { data, error } = await supabase
            .from('state')
            .update({
                state,
                date: getDate()
            })
            .eq('id', 1)
            .select();

        if (error) {
            return response(500, null, error.message, res);
        }

        resetRealtimeTable();
        resetRecordsTable();

        return response(200, data, "State updated", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to get state details
async function getState(req, res) {
    try {
        const { data, error } = await supabase
            .from('state')
            .select('*')

        if (error) {
            return response(500, null, error.message, res);
        }

        return response(200, data, "State retrieved", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to count elapsed days
async function getDays(req, res) {
    try {
        const { data: stateData, error: stateError } = await supabase
            .from('state')
            .select('*')
            .eq('id', 1);

        if (stateError) {
            return response(500, null, stateError.message, res);
        }

        const { state, date } = stateData[0];

        // Check if state is 1
        if (state !== 1) {
            return response(400, null, "State is not active", res);
        }

        const pastDate = new Date(date);
        const currentDate = new Date();
        const currentDateWithOffset = new Date(currentDate.getTime() + (7 * 60 * 60 * 1000));

        // Calculate the difference in time
        const diffTime = Math.abs(currentDateWithOffset - pastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return response(200, { days: diffDays }, "Elapsed days counted", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to calculate fuzzy output
async function calculateFIS(req, res) {
    let heat, exha;

    const { currentTemperature, targetTemperature } = req.body;

    try {
        const { data, error } = await supabase
            .from('control')
            .select('*')

        if (error) {
            return response(500, null, error.message, res);
        }
        
        const vc1 = data[0].vc1, vc2 = data[0].vc2, vc3 = data[0].vc3;
        const c1 = data[0].c1, c2 = data[0].c2, c3 = data[0].c3;
        const lw1 = data[0].lw1, lw2 = data[0].lw2, lw3 = data[0].lw3;
        const w1 = data[0].w1, w2 = data[0].w2, w3 = data[0].w3;
        const h1 = data[0].h1, h2 = data[0].h2, h3 = data[0].h3;
        const vh1 = data[0].vh1, vh2 = data[0].vh2, vh3 = data[0].vh3;

        if (currentTemperature > targetTemperature){
            const [exhaustPWM, heaterPWM] = getPWMOutput(vc1, vc2, vc3, c1, c2, c3, lw1, lw2, lw3, w1, w2, w3, h1, h2, h3, vh1, vh2, vh3, currentTemperature, targetTemperature);
            exha = exhaustPWM;
            heat = heaterPWM;
        } else if (currentTemperature < targetTemperature){
            const [heaterPWM, exhaustPWM] = getPWMOutput(vc1, vc2, vc3, c1, c2, c3, lw1, lw2, lw3, w1, w2, w3, h1, h2, h3, vh1, vh2, vh3, currentTemperature, targetTemperature);
            heat = heaterPWM;
            exha = exhaustPWM;
        }

        const { data: fuzzyData, error: fuzzyError } = await supabase
            .from('fuzzy')
            .update({
                heater_pwm: heat,
                exhaust_pwm: exha,
                updated_at: getDate()
            })
            .eq('id', 1)
            .select();

        if (fuzzyError) {
            return response(500, null, fuzzyError.message, res);
        }
        return response(200, fuzzyData, "Fuzzy output calculated", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Function to get fuzzy results
async function getFuzzy(req, res) {
    try {
        const { data, error } = await supabase
            .from('fuzzy')
            .select('*')

        if (error) {
            return response(500, null, error.message, res);
        }

        return response(200, data, "PWM value retrieved", res);
    } catch (error) {
        return response(500, null, error.message, res);
    }
}

// Exporting the handler functions
module.exports = { register, 
    logIn, 
    getUser, 
    getRealtime, 
    postRealtime, 
    postRecords,
    getRecords, 
    getControl, 
    putControlTemp, 
    putControlMoist, 
    deactivateDevice, 
    activateDevice, 
    getState,
    getDays,
    calculateFIS,
    getFuzzy };