const fuzzyis = require('fuzzyis');
const { LinguisticVariable, Term, Rule, FIS } = fuzzyis;

function getPWMOutput(vc1, vc2, vc3, c1, c2, c3, lw1, lw2, lw3, w1, w2, w3, h1, h2, h3, vh1, vh2, vh3, currentTemperature, targetTemperature) {
    // Create the fuzzy inference system
    const system = new FIS('Compost Temperature Control System');

    // Define output variables
    const heaterPWM = new LinguisticVariable('heater', [0, 255]);
    const exhaustPWM = new LinguisticVariable('exhaust', [0, 255]);
    system.addOutput(heaterPWM);
    system.addOutput(exhaustPWM);

    const currentTemp = new LinguisticVariable('current', [vc2, vh2]);
    const targetTemp = new LinguisticVariable('target', [vc2, vh2]);
    system.addInput(currentTemp);
    system.addInput(targetTemp);

    // Describe terms for each variable
    currentTemp.addTerm(new Term('veryCold', 'triangle', [vc1, vc2, vc3]));
    currentTemp.addTerm(new Term('cold', 'triangle', [c1, c2, c3]));
    currentTemp.addTerm(new Term('lukeWarm', 'triangle', [lw1, lw2, lw3]));
    currentTemp.addTerm(new Term('warm', 'triangle', [w1, w2, w3]));
    currentTemp.addTerm(new Term('hot', 'triangle', [h1, h2, h3]));
    currentTemp.addTerm(new Term('veryHot', 'triangle', [vh1, vh2, vh3]));

    // Add terms to targetTemp
    targetTemp.addTerm(new Term('maturation', 'triangle', [vc1, vc2, vc3]));
    targetTemp.addTerm(new Term('mesophilic2', 'triangle', [c1, c2, c3]));
    targetTemp.addTerm(new Term('mesophilic1', 'triangle', [lw1, lw2, lw3]));
    targetTemp.addTerm(new Term('thermophilic1', 'triangle', [w1, w2, w3]));
    targetTemp.addTerm(new Term('thermophilic2', 'triangle', [h1, h2, h3]));
    targetTemp.addTerm(new Term('overheat', 'triangle', [vh1, vh2, vh3]));

    heaterPWM.addTerm(new Term('veryLow', 'triangle', [92, 102, 120]));         // 40% PWM
    heaterPWM.addTerm(new Term('low', 'triangle', [115, 204, 224]));            // 80% PWM
    heaterPWM.addTerm(new Term('medium', 'triangle', [220, 230, 240]));         // 90% PWM
    heaterPWM.addTerm(new Term('high', 'triangle', [232, 242, 252]));           // 95% PWM
    heaterPWM.addTerm(new Term('veryHigh', 'triangle', [245, 255, 265]));       // 100% PWM    

    exhaustPWM.addTerm(new Term('veryLow', 'triangle', [-5, 0, 5]));             // 0% PWM
    exhaustPWM.addTerm(new Term('low', 'triangle', [15, 26, 37]));               // 10% PWM
    exhaustPWM.addTerm(new Term('medium', 'triangle', [41, 51, 61]));            // 20% PWM
    exhaustPWM.addTerm(new Term('high', 'triangle', [82, 102, 122]));            // 40% PWM
    exhaustPWM.addTerm(new Term('veryHigh', 'triangle', [184, 204, 224]));       // 80% PWM    

    // Define rules for the system (reusing the provided rules)
    system.rules = [
        new Rule(['veryCold', 'maturation'], ['veryLow', 'veryLow'], 'and'),
        new Rule(['cold', 'maturation'], ['low', 'veryLow'], 'and'),
        new Rule(['lukeWarm', 'maturation'], ['medium', 'veryLow'], 'and'),
        new Rule(['warm', 'maturation'], ['high', 'veryLow'], 'and'),
        new Rule(['hot', 'maturation'], ['veryHigh', 'veryLow'], 'and'),
        new Rule(['veryHot', 'maturation'], ['veryHigh', 'veryLow'], 'and'),
        new Rule(['veryCold', 'mesophilic2'], ['low', 'veryLow'], 'and'),
        new Rule(['cold', 'mesophilic2'], ['veryLow', 'veryLow'], 'and'),
        new Rule(['lukeWarm', 'mesophilic2'], ['low', 'veryLow'], 'and'),
        new Rule(['warm', 'mesophilic2'], ['medium', 'veryLow'], 'and'),
        new Rule(['hot', 'mesophilic2'], ['high', 'veryLow'], 'and'),
        new Rule(['veryHot', 'mesophilic2'], ['veryHigh', 'veryLow'], 'and'),
        new Rule(['veryCold', 'mesophilic1'], ['medium', 'veryLow'], 'and'),
        new Rule(['cold', 'mesophilic1'], ['low', 'veryLow'], 'and'),
        new Rule(['lukeWarm', 'mesophilic1'], ['veryLow', 'veryLow'], 'and'),
        new Rule(['warm', 'mesophilic1'], ['low', 'veryLow'], 'and'),
        new Rule(['hot', 'mesophilic1'], ['medium', 'veryLow'], 'and'),
        new Rule(['veryHot', 'mesophilic1'], ['high', 'veryLow'], 'and'),
        new Rule(['veryCold', 'thermophilic1'], ['high', 'veryLow'], 'and'),
        new Rule(['cold', 'thermophilic1'], ['medium', 'veryLow'], 'and'),
        new Rule(['lukeWarm', 'thermophilic1'], ['low', 'veryLow'], 'and'),
        new Rule(['warm', 'thermophilic1'], ['veryLow', 'veryLow'], 'and'),
        new Rule(['hot', 'thermophilic1'], ['low', 'veryLow'], 'and'),
        new Rule(['veryHot', 'thermophilic1'], ['medium', 'veryLow'], 'and'),
        new Rule(['veryCold', 'thermophilic2'], ['veryHigh', 'veryLow'], 'and'),
        new Rule(['cold', 'thermophilic2'], ['high', 'veryLow'], 'and'),
        new Rule(['lukeWarm', 'thermophilic2'], ['medium', 'veryLow'], 'and'),
        new Rule(['warm', 'thermophilic2'], ['low', 'veryLow'], 'and'),
        new Rule(['hot', 'thermophilic2'], ['veryLow', 'veryLow'], 'and'),
        new Rule(['veryHot', 'thermophilic2'], ['low', 'veryLow'], 'and'),
    ];

    // Return the precise output based on the input currentTemp and targetTemp
    const output = system.getPreciseOutput([currentTemperature, targetTemperature]);

    return output;
}

module.exports = getPWMOutput;