import { initializeServer } from "./opcua-server.js";
import { runOpcuaClient } from "./opcua-client.js";

(async () => {
    const port = 4844;

    // Initialize the OPC UA server
    await initializeServer(port, '/Bakery').catch((err) => {
        console.error("Failed to initialize the server:", err);
    });

    // Run the OPC UA client
    await runOpcuaClient(port);
})();
