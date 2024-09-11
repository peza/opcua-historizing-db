# opcua-historizing-db
Demo for Opcua Server-Client Historizing data from and to in-memory DB SQLite

## Overview

This project is a demonstration of an OPC UA Server-Client setup that uses SQLite as an in-memory database to store and manage historical data. It is a Node.js project that showcases how to historize data from an OPC UA server into an SQLite database and retrieve it efficiently.

## Setup

1. **Clone the Repository:**

   ```sh
   git clone https://github.com/yourusername/opcua-historizing-db.git
   cd opcua-historizing-db

# Install Dependencies:
    npm install

# Start the App:
    npm start

# Implementation details
Server: The OPC UA server runs on localhost at port 4844.

It exposes one variable with the node ID ns=1;s=Temperature.
- The server maintains an in-memory SQLite database to store temperature data.
- A new temperature value is generated every second.
- An event named newTemperatureValue is emitted every time a new temperature value is generated.
- This event triggers the saving of the new temperature value to the SQLite database and updates value of the OPC UA variable ns=1;s=Temperature.
- The server get historic data by fetching data from the database.
- The maxOnLineValues for the variable is set to 1, meaning no default buffering for the variable is done.

Client: Connects to the server and subscribes to changes of the temperature variable.
- Reads historical data every 5 seconds.
- Currently, there is no limit on the number of records to read from the server.
- The client is set to read the last 20 minutes of data for the variable.

# License
- This project is licensed under the MIT License. Please include appropriate attribution when using this code.

# Notes
- Make sure to have Node.js and npm installed to run the project.
- For any issues or contributions, please refer to the Contributing Guidelines or open an issue on the GitHub repository.
- Feel free to adjust any specifics to match the exact details of your project and its configuration.