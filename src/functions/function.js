function response(status, data, message, res) {
    res.status(status).json({ status, data, message });
}

function getDate() {
    const dt = new Date();
    const offset = 7 * 60 * 60 * 1000; // 7-hour offset
    const newDate = new Date(dt.getTime() + offset);
    return newDate.toISOString();
}

function calculateAverage(data) {
    const total = data.length;
    const sum = data.reduce((acc, curr) => ({
        temp: acc.temp + curr.temp,
        moist: acc.moist + curr.moist,
        ph: acc.ph + curr.ph
    }), { temp: 0, moist: 0, ph: 0});

    return {
        temp: sum.temp / total,
        moist: sum.moist / total,
        ph: sum.ph / total
    };
}


function distributeValues(min, max) {
    const vc2 = min;
    const vh2 = max;
    const step = (vh2 - vc2) / (6 - 1); // Calculate the step value
    const extend = step * 0.8333;

    //calculate center member
    const c2 = vc2 + 1 * step;
    const lw2 = vc2 + 2 * step;
    const w2 = vc2 + 3 * step;
    const h2 = vc2 + 4 * step;

    //calculate left and right values
    const vc1 = vc2 - extend;
    const vc3 = vc2 + extend;

    const c1 = c2 - extend;
    const c3 = c2 + extend;

    const lw1 = lw2 - extend;
    const lw3 = lw2 + extend;

    const w1 = w2 - extend;
    const w3 = w2 + extend;

    const h1 = h2 - extend;
    const h3 = h2 + extend;

    const vh1 = vh2 - extend;
    const vh3 = vh2 + extend;

    return {
        vc1, vc2, vc3,
        c1, c2, c3,
        lw1, lw2, lw3,
        w1, w2, w3,
        h1, h2, h3,
        vh1, vh2, vh3
    };
}

module.exports = { response, getDate, calculateAverage, distributeValues };