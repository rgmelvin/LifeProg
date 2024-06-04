import { format, writeToPath } from '@fast-csv/format';
import * as fs from 'fs';
import { createInterface } from 'readline';
import { spawn } from 'child_process';

console.log("Simulation started!");

const STEFAN_BOLTZMAN_CONSTANT = 5.670374419e-8;
const UPDATE_INTERVAL = 1000; // Update interval in milliseconds
// EMISSION_INTENSITY = 0.001; // Adjust this to control emission intensity from the source account.

interface SourceAccount {
    balance: number;
    emissionRate: number;
    lastUpdateTime: number;
    initialSupply: number;
}

interface Environment {
    balance: number;
}

function calculateSurfaceArea(volume: number): number {
    const PI = 3.14159;
    const radius = Math.cbrt(volume / ((4 / 3) * PI));
    return 4 * PI * Math.pow(radius, 2);
}

// Define the updateSourceAndEnvironment function
function updateSourceAndEnvironment(source: SourceAccount, environment: Environment, currentTime: number): void {
    const elapsedTime = (currentTime - source.lastUpdateTime) / 1000; // Convert milliseconds to seconds
    const surfaceArea = calculateSurfaceArea(source.balance);
    const surfaceTemperature = source.balance; // Using source balance as surface temperature for simplicity
    const emissionAmount = calculateEmissionAmount(source, elapsedTime);
    
    // Update source balance
    source.balance -= emissionAmount;
    
    // Update environment balance
    environment.balance += emissionAmount;
    
    source.lastUpdateTime = currentTime; // Update last update time
}

function calculateEmissionAmount(source: SourceAccount, elapsedTime: number): number {
    const surfaceArea = calculateSurfaceArea(source.balance);
    const surfaceTemperature = source.balance; // Using source balance as surface temperature for simplicity
    const emissionRate = calculateEmissionRate(surfaceArea, surfaceTemperature, source.balance);
    return emissionRate * elapsedTime;
}

function calculateEmissionRate(surfaceArea: number, surfaceTemperature: number, sourceBalance: number): number {
    // Adjust the emission rate based on the desired ratio
    const desiredRatio = 4.65e20; // Desired ratio of source balance to emission rate
    return STEFAN_BOLTZMAN_CONSTANT * surfaceArea * Math.pow(surfaceTemperature, 4) / desiredRatio;
}

function initializeSourceAccount(initialSupply: number): SourceAccount {
    const surfaceArea = calculateSurfaceArea(initialSupply);
    const surfaceTemperature = initialSupply;
    const emissionRate = calculateEmissionRate(surfaceArea, surfaceTemperature, initialSupply);
    return {
        balance: initialSupply,
        emissionRate,
        lastUpdateTime: Date.now(),
        initialSupply,
    };
}

function initializeEnvironment(): Environment {
    return { balance: 0 }; // Start with no environment balance.
}

async function main() {
    const filePath = '/Users/richardmelvin/LifeProg/simulation_data.csv'; // Modify this path as needed.

    console.log("Initializing Source account...");
    const source = initializeSourceAccount(1);
    console.log("Source account initialized.");

    console.log("Initializing Environment account....");
    const environment = initializeEnvironment();
    console.log("Environment account initialized.");

    let currentTime = Date.now();
    console.log("Current time:", currentTime);

    let iterationCount = 0;
    const csvData: any[] = [];

    const r1 = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    let headersWritten = false; // Flag to track if headers have been written

    while (source.balance > 0) {
        for (let i = 0; i < 10 && source.balance > 0; i++) {
            console.log("Simulation iteration: ", iterationCount);
            await new Promise(resolve => setTimeout(resolve, UPDATE_INTERVAL));
            currentTime = Date.now();
            updateSourceAndEnvironment(source, environment, currentTime);

            csvData.push([currentTime, source.balance, environment.balance]);
            iterationCount++;
        }

        // Create a write stream to append to the CSV file
        const writeStream = fs.createWriteStream(filePath, { flags: 'a' });
        // Create a CSV formatter stream
        const csvStream = format({ headers: !headersWritten, writeHeaders: !headersWritten });

        // Pipe the CSV formatter to the write stream.
        csvStream.pipe(writeStream);

        // Write headers manually if they haven't been written
        if (!headersWritten) {
            csvStream.write(['Time', 'Source Balance', 'Environment Balance']);
            headersWritten = true;
        }

        // Write each row in the csvData to the CSV stream
        csvData.forEach(row => csvStream.write(row));
        // Add a newline explicitly if needed
        writeStream.write('\n')
        // End the CSV stream
        csvStream.end();
        // Wait for the write stream to finish
        await new Promise(resolve => writeStream.on('finish', resolve));

        csvData.length = 0; // Clear csvData after writing

        // Prompt the user for input to continue or terminate the simulation.
        const userInput = await new Promise<string>(resolve => r1.question(`Continue simulation? Source balance: ${source.balance} (y/n)`, resolve));
        if (userInput.toLowerCase() !== 'y') {
            console.log(`Simulation terminated by user after ${iterationCount} iterations`);
            r1.close(); // Close the readline interface upon user termination.
            break;
        }
    }

    if (source.balance <= 0) {
        console.log(`Simulation terminated because source balance reached zero after ${iterationCount} iterations.`);
    }

    r1.close(); // Close the readline interface upon program termination.

    console.log(`Simulation terminated after ${iterationCount} iterations.`);
}

// Call the main function to start the simulation.
main();
