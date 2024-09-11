import opcua, { HistoryReadRequest, TimestampsToReturn } from "node-opcua";
import { ReadRawModifiedDetails } from "node-opcua-service-history";

export const runOpcuaClient = async (port = 4844) => {
    const client = opcua.OPCUAClient.create({ endpoint_must_exist: false });
    const endpointUrl = `opc.tcp://localhost:${port}/`;
    let session, subscription, intervalId;

    try {
        // Step 1: Connect to the server
        await client.connect(endpointUrl);
        console.log("Connected to the OPC UA server!");

        // Step 2: Create a session
        session = await client.createSession();
        console.log("Session created!");

        // Step 3: Browse the server to find the node of interest
        const browseResult = await session.browse("RootFolder");
        console.log("Browsing the root folder...");

        // Display browse results (for debugging)
        browseResult.references.forEach((reference) => {
            console.log(reference.browseName.toString());
        });

        const nodeId = "ns=1;s=Temperature"; // NodeId for subscription

        // Step 4: Create a subscription
        subscription = opcua.ClientSubscription.create(session, {
            requestedPublishingInterval: 1000,
            requestedLifetimeCount: 100,
            requestedMaxKeepAliveCount: 10,
            maxNotificationsPerPublish: 10,
            publishingEnabled: true,
            priority: 10
        });

        subscription.on("started", () => {
            console.log("Subscription started - subscriptionId=", subscription.subscriptionId);
        }).on("keepalive", () => {
            console.log("Keepalive");
        }).on("terminated", () => {
            console.log("Subscription terminated");
        });

        // Step 5: Subscribe to the value of the node
        const itemToMonitor = {
            nodeId: nodeId,
            attributeId: opcua.AttributeIds.Value
        };
        const parameters = {
            samplingInterval: 100,
            discardOldest: true,
            queueSize: 10
        };

        const monitoredItem = opcua.ClientMonitoredItem.create(
            subscription,
            itemToMonitor,
            parameters,
            opcua.TimestampsToReturn.Both
        );

        monitoredItem.on("changed", (dataValue) => {
            console.log("Real-time Temperature Change:", dataValue.value.value);
        });

        // Step 6: Set an interval to read historical data every 5 seconds for the last minute
        intervalId = setInterval(async () => {
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - 20 * 60 * 1000); // 20 minutes ago

            try {
                const request = new HistoryReadRequest({
                    historyReadDetails: new ReadRawModifiedDetails({
                        startTime: startTime,
                        endTime: endTime,
                        returnBounds: false
                    }),
                    timestampsToReturn: TimestampsToReturn.Both,
                    nodesToRead: [{ nodeId }]
                });

                const historyReadResult = await session.historyRead(request);
                const historyData = historyReadResult.results[0].historyData;
                const dataValues = historyData.dataValues;

                console.log("\n=== Historical Temperature Data for the Last Minute ===");
                dataValues.forEach(dataValue => {
                    console.log(`Temperature: ${dataValue.value.value}, Timestamp: ${dataValue.sourceTimestamp}`);
                });
                console.log("=========================================================\n");
            } catch (err) {
                console.error("Error reading historical data:", err);
            }

        }, 5000); // Read every 5 seconds

        // Graceful shutdown handler
        const gracefulShutdown = async () => {
            console.log("\nShutting down the OPC UA client...");
            if (intervalId) clearInterval(intervalId); // Clear the historical data interval
            if (subscription) {
                await subscription.terminate();
                console.log("Subscription terminated.");
            }
            if (session) {
                await session.close();
                console.log("Session closed.");
            }
            await client.disconnect();
            console.log("Disconnected from the OPC UA server!");
            process.exit(0); // Exit the process cleanly
        };

        // Catch signals for graceful shutdown
        process.on("SIGINT", async () => {
            console.log("SIGINT received")
            await gracefulShutdown
        });
        process.on("SIGTERM", async () => {
            console.log("SIGTERM received")
            await gracefulShutdown
        });

    } catch (err) {
        console.error("An error has occurred:", err);
    }
};
