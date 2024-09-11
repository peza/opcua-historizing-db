import { DataType, DataValue, HistoryData, HistoryReadResult, OPCUAServer, StatusCodes, Variant } from "node-opcua";
import { EventEmitter } from 'events';
import { initDb, storeTemperatureValueInDb, retrieveTemperatureValuesFromDb } from './db.js';

const temperatureEvents = new EventEmitter();

export const initializeServer = async (port, resourcePath) => {
    const server = new OPCUAServer({
        port,
        resourcePath: resourcePath,
    });

    await server.initialize();
    console.log("OPC UA Server initialized");

    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();

    const theFolder = namespace.addFolder(addressSpace.rootFolder.objects, {
        browseName: 'MyFolderName',
    });

    const domainRootObject = namespace.addObject({
        browseName: 'testing',
        organizedBy: theFolder
    });

    const temperatureNode = namespace.addVariable({
        componentOf: domainRootObject,
        nodeId: "ns=1;s=Temperature",
        browseName: 'Temperature',
        definition: "(°C)",
        valuePrecision: 0.01,
        engineeringUnitsRange: { low: -100, high: 200 },
        instrumentRange: { low: -100, high: 200 },
        engineeringUnits: {
            namespaceUri: "http://www.opcfoundation.org/UA/units/un/cefact",
            unitId: 4408652,
            displayName: "°C",
            description: "degree Celsius"
        },
        dataType: "Double",
        value: new Variant({ dataType: DataType.Double, value: 20.0 }),
        historizing: true,
    });

    // Initialize SQLite database
    const db = await initDb();

    addressSpace.installHistoricalDataNode(temperatureNode, {maxOnlineValues:0})
    // Custom implementation of historyRead
    temperatureNode.historyRead = async (context, historyReadDetails) => {
        try {
            const { startTime, endTime } = historyReadDetails;
            const filteredData = await retrieveTemperatureValuesFromDb(db, startTime, endTime);

            const dataValues = filteredData.map(item => new DataValue({
                value: new Variant({ dataType: DataType.Double, value: item.value }),
                sourceTimestamp: new Date(item.timestamp),
                serverTimestamp: new Date(item.timestamp)
            }));

            const historyData = new HistoryData({ dataValues });

            return new HistoryReadResult({
                statusCode: StatusCodes.Good,
                historyData: historyData
            });
        } catch (error) {
            console.error("Error reading historical data:", error);
            return new HistoryReadResult({
                statusCode: StatusCodes.Bad,
                historyData: new HistoryData({ dataValues: [] })
            });
        }
    };

    // Listener 1: Update the node's value asynchronously
    temperatureEvents.on('newTemperatureValue', ({ newValue, timestamp }) => {
        setImmediate(() => {
            temperatureNode.setValueFromSource(new Variant({
                dataType: DataType.Double,
                value: newValue
            }), StatusCodes.Good, timestamp);

            console.log(`Temperature Node Updated: New Value = ${newValue} at ${timestamp}`);
        });
    });

    // Listener 2: Store the value in the historical data asynchronously
    temperatureEvents.on('newTemperatureValue', ({ newValue, timestamp }) => {
        setImmediate(async () => {
            await storeTemperatureValueInDb(db, newValue, timestamp);
            console.log(`Temperature Value Stored in SQLite: ${newValue} at ${timestamp}`);
        });
    });

    // Set an interval to generate a new temperature value and trigger the event
    const temperatureInterval = setInterval(() => {
        const { newValue, timestamp } = generateNewTemperatureValue();
        temperatureEvents.emit('newTemperatureValue', { newValue, timestamp });
    }, 1000);

    // Start the server
    await server.start();
    console.log(`Server started on port ${port}`);
    console.log("Press Ctrl+C to stop the server");

    // Graceful shutdown handler
    async function stop() {
        console.log("Shutting down the server...");
        clearInterval(temperatureInterval); // Clear the interval
        await server.shutdown(1000); // Gracefully shut down the server with a 1-second timeout
        console.log("Server has been shut down");

        try {
            await db.close(); // Properly close SQLite database
            console.log("SQLite database closed");
        } catch (error) {
            console.error("Error closing SQLite database:", error);
        }

        process.exit(0); // Exit the process cleanly
    }

    // Catch signals for graceful shutdown
    process.on("SIGINT", async () => {
        await stop();
    });

    process.on("SIGTERM", async () => {
        await stop();
    });
};

function generateNewTemperatureValue() {
    const newValue = (Math.random() * 100).toFixed(3); // Limit to 3 decimal places
    const timestamp = new Date();
    return { newValue: parseFloat(newValue), timestamp }; // Convert back to a number
}

