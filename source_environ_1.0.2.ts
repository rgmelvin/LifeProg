import * as fs from 'fs';
import { createInterface } from 'readline';
import { format } from '@fast-csv/format';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import * as math from 'mathjs';
import { ChartConfiguration, ChartType } from 'chart.js';

// Constants
const STEFAN_BOLTZMAN_CONSTANT = 5.670374419e-8;
const UPDATE_INTERVAL = 1000; // milliseconds
const EMISSION_INTENSITY = 0.001;
const KAPPA = 3.5;
const TEMPERATURE = 6000; // Kelvin, example temperature

// Interfaces
interface SourceAccount {
    balance: number;
    emissionRate: number;
    lastUpdateTime: number;
    initialSupply: number;
}

interface Environment {
    balance: number;
    levels: number[];
}

// Function to generate kappa distributed random values
function kappaRandom(kappa: number, numSamples: number): number[] {
    const values = [];
    for (let i = 0; i < numSamples; i++) {
        const u = Math.random();
        const v = Math.random();
        const w = Math.random();
        const x = Math.pow(u, -1 / kappa) - 1;
        const y = Math.pow(v, -1 / kappa) - 1;
        const z = Math.pow(w, -1 / kappa) - 1;
        values.push((x + y + z) / 3);
    }
    return values;
}

// Function to calculate the Maxwell-Boltzmann probability
function maxwellBoltzmannProbability(energy: number, temperature: number): number {
    return Math.sqrt(energy / (Math.PI * Math.pow(temperature, 3))) * Math.exp(-energy / temperature);
}

// Function to calculate surface area based on volume
function calculateSurfaceArea(volume: number): number {
    const PI = 3.14159;
    const radius = Math.cbrt(volume / ((4 / 3) * PI));
    return 4 * PI * Math.pow(radius, 2);
}

// Function to calculate emission rate
function calculateEmissionRate(surfaceArea: number, surfaceTemperature: number): number {
    return (STEFAN_BOLTZMAN_CONSTANT * surfaceArea * Math.pow(surfaceTemperature, 4)) / (4.65e20);
}

// Function to update source and environment balances
function updateSourceAndEnvironment(source: SourceAccount, environment: Environment, currentTime: number): void {
    const elapsedTime = (currentTime - source.lastUpdateTime) / 1000;
    const surfaceArea = calculateSurfaceArea(source.balance);
    const emissionAmount = calculateEmissionRate(surfaceArea, source.balance) * elapsedTime;

    // Update balances
    source.balance -= emissionAmount;
    environment.balance += emissionAmount;

    // Distribute emissionAmount across levels
    const levelDistribution = kappaRandom(KAPPA, 100);
    const totalDistribution = levelDistribution.reduce((sum, val) => sum + val, 0);
    const normalizedDistribution = levelDistribution.map(val => val / totalDistribution);
    normalizedDistribution.forEach((val, index) => {
        environment.levels[index] += val * emissionAmount;
    });

    source.lastUpdateTime = currentTime;
}

// Function to initialize source account
function initializeSourceAccount(initialSupply: number): SourceAccount {
    const surfaceArea = calculateSurfaceArea(initialSupply);
    const emissionRate = calculateEmissionRate(surfaceArea, initialSupply);
    return {
        balance: initialSupply,
        emissionRate,
        lastUpdateTime: Date.now(),
        initialSupply,
    };
}

// Function to initialize environment
function initializeEnvironment(): Environment {
    return { balance: 0, levels: Array(100).fill(0) };
}

// Function to check if a file exists
function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
}

// Function to generate a new filename if the file already exists
function generateNewFilename(filePath: string): string {
    const baseName = filePath.split('.').slice(0, -1).join('.');
    const extension = filePath.split('.').pop();
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    return `${baseName}_${timestamp}.${extension}`;
}

// Function to prompt the user for permission to overwrite
async function askForPermissionToOverwrite(filePath: string): Promise<boolean> {
    const readlineInterface = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const answer = await new Promise<string>(resolve => {
        readlineInterface.question(`File "${filePath}" already exists. Do you want to overwrite it? (y/n): `, resolve);
    });

    readlineInterface.close();

    return answer.toLowerCase() === 'y';
}

// Main function
async function main() {
    const filePath = './simulation_data.csv';
    const levelFilePath = './level_data.csv';

    // Check if files exist
    if (fileExists(filePath)) {
        const shouldOverwriteSimulationData = await askForPermissionToOverwrite(filePath);
        if (!shouldOverwriteSimulationData) {
            console.log('Simulation data will not be overwritten.\nSave data to another location before continuing.\nExiting...');
            return;
        }
    }

    if (fileExists(levelFilePath)) {
        const shouldOverwriteLevelData = await askForPermissionToOverwrite(levelFilePath);
        if (!shouldOverwriteLevelData) {
            console.log('Level data will not be overwritten.\nSave data to another location before continuing.\nExiting...');
            return;
        }
    }

    // Initialize source and environment
    const source = initializeSourceAccount(1000);
    const environment = initializeEnvironment();
    let currentTime = Date.now();
    let iterationCount = 0;
    const csvData: any[] = [];
    let headersWritten = false;
    let levelHeadersWritten = false;

    // Set up readline for user input
    const r1 = createInterface({ input: process.stdin, output: process.stdout });

    console.log('Simulation started. Press return to stop.');

    // Function to log data every 10 iterations
    async function logData() {
        // Write CSV data
        const writeStream = fs.createWriteStream(filePath, { flags: 'a' });
        const csvStream = format({ headers: !headersWritten, writeHeaders: !headersWritten, alwaysWriteHeaders: true });
        csvStream.pipe(writeStream);
        if (!headersWritten) {
            csvStream.write(['Time', 'Source Balance', 'Environment Balance']);
            headersWritten = true;
        }
        csvData.forEach(row => {
            csvStream.write(row)
            csvStream.write('\n');
         });
            
        csvStream.end();
        await new Promise(resolve => writeStream.on('finish', resolve));
        csvData.length = 0;

        // Write level data
        const levelWriteStream = fs.createWriteStream(levelFilePath, { flags: 'a' });
        const levelCsvStream = format({ headers: !levelHeadersWritten, writeHeaders: !levelHeadersWritten, alwaysWriteHeaders: true });
        levelCsvStream.pipe(levelWriteStream);
        if (!levelHeadersWritten) {
            levelCsvStream.write(['Level', 'Balance']);
            levelHeadersWritten = true;
        }
        environment.levels.forEach((balance, index) => {
            levelCsvStream.write([index + 1, balance])
            levelCsvStream.write('\n')
        });
        levelCsvStream.end();
        await new Promise(resolve => levelWriteStream.on('finish', resolve));
    }

    // Simulation loop
    let simulationRunning = true;

    // Stop the simulation when the return key is pressed
    r1.on('line', () => {
        simulationRunning = false;
    });

    const startTime = Date.now();

    while (simulationRunning && source.balance > 0) {
        for (let i = 0; i < 10 && source.balance > 0; i++) {
            await new Promise(resolve => setTimeout(resolve, UPDATE_INTERVAL));
            currentTime = Date.now();
            updateSourceAndEnvironment(source, environment, currentTime);

            csvData.push([currentTime, source.balance, environment.balance]);
            iterationCount++;
        }

        await logData();
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`Simulation terminated after ${iterationCount} iterations and ${duration.toFixed(2)} seconds.`);
    r1.close();

    // Generate and save graphs
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 600 });

    // Source and Environment Balance over Time
    const timeLabels = csvData.map(row => new Date(row[0]).toLocaleTimeString());
    const sourceBalanceData = csvData.map(row => row[1]);
    const environmentBalanceData = csvData.map(row => row[2]);

    const balanceConfiguration: ChartConfiguration<'line'> = {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: 'Source Balance',
                    data: sourceBalanceData,
                    borderColor: 'red',
                    fill: false,
                },
                {
                    label: 'Environment Balance',
                    data: environmentBalanceData,
                    borderColor: 'blue',
                    fill: false,
                }
            ]
        },
        options: {
            scales: {
                x: { display: true, title: { display: true, text: 'Time' } },
                y: { display: true, title: { display: true, text: 'Balance' } }
            }
        }
    };
    const balanceImage = await chartJSNodeCanvas.renderToBuffer(balanceConfiguration);
    fs.writeFileSync('./simulation_chart.png', balanceImage);

    // Environment Balance by Level
    const levelLabels = environment.levels.map((_, index) => (index + 1).toString());
    const levelData = environment.levels;

    const levelConfiguration: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
            labels: levelLabels,
            datasets: [
                {
                    label: 'Environment Balance by Level',
                    data: levelData,
                    backgroundColor: 'blue',
                }
            ]
        },
        options: {
            scales: {
                x: { display: true, title: { display: true, text: 'Level' } },
                y: { display: true, title: { display: true, text: 'Balance' } }
            }
        }
    };
    const levelImage = await chartJSNodeCanvas.renderToBuffer(levelConfiguration);
    fs.writeFileSync('./level_chart.png', levelImage);

    // Level over Time
    const levelTimeConfiguration: ChartConfiguration<'line'> = {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: levelLabels.map((label, index) => ({
                label: `Level ${label}`,
                data: csvData.map(row => environment.levels[index]),
                borderColor: `hsl(${index * 3.6}, 100%, 50%)`,
                fill: false,
            })),
        },
        options: {
            scales: {
                x: { display: true, title: { display: true, text: 'Time' } },
                y: { display: true, title: { display: true, text: 'Balance' } }
            }
        }
    };
    const levelTimeImage = await chartJSNodeCanvas.renderToBuffer(levelTimeConfiguration);
    fs.writeFileSync('./level_time_chart.png', levelTimeImage);

    console.log('Graphs have been generated.');
}

main().catch(err => console.error(err));
