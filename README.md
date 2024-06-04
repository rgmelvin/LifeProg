# Emission Simulation and Data Visualization

## Overview
This project simulates the emission and transfer of energy from a source to an environment over time. The simulation updates the balance of energy in both the source and environment, distributes the emitted energy across multiple levels in the environment using a kappa distribution, and visualizes the results through dynamically generated charts.

This is a key peice of a larger project that aims to generate a sustainable ecosystem that transforms and recycles the emitted energy to produce programatic work.
Current work (todo list): 
- Gravity function that collects unused energy back to the source.
- Time dependent energy decay to less valuable heat
- Organism program that can collect energy to run functions.

## Features
- **Energy Emission Simulation**: Models the emission of energy based on the Stefan-Boltzmann law.
- **Data Persistence**: Stores simulation data in CSV files.
- **Interactive User Input**: Prompts users to decide on file overwriting or automatic new file name generation if files already exist.
- **Data Visualization**: Generates line and bar charts to visualize the energy balance and level distribution using Chart.js.
- **Kappa Distribution**: Utilizes a kappa distribution to distribute energy levels within the environment.

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/rgmelvin/LifeProg.git
   cd LifeProg

2. Install dependencies:
   ```sh
   npm install

## Usage
Run the simulation:
```sh
ts-node source_environ_1.0.x.ts
```
The simulation will start and prompt you to press enter to stop. The results will be saved in CSV files and charts will be generated as PNG images.

## How it works
1. Initialization: The source account and environment are initialized with predefined parameters.
2. Simulation Loop: The simulation runs in a loop, updating the source and environment balances at each interval.
3. Data Logging: Data is logged every 10 iterations and written to CSV files.
4. Chart Generation: At the end of the simulation, line and bar charts are generated to visualize the data.

## Dependencies:
  - Node.js
  - TypeScript
  - Chart.js
  - chartjs-node-canvas
  - mathjs
  - fast-csv

## License
This project is licensed under the MIT license.

I am a learner and am open to constructive comment:  rgmelvinphd@gmail.com
