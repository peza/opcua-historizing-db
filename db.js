import sqlite3 from 'sqlite3';
import {open} from 'sqlite';

// Initialize and open an SQLite database
export const initDb = async () => {
    const db = await open({
        filename: ':memory:',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE temp_temperature_data (
            timestamp DATETIME NOT NULL,
            value REAL NOT NULL
        )
    `);

    return db;
};

export const storeTemperatureValueInDb = async (db, value, timestamp) => {
    try {
        await db.run('INSERT INTO temp_temperature_data (timestamp, value) VALUES (?, ?)', [timestamp, value]);
    } catch (error) {
        console.error("Error storing temperature value in SQLite:", error);
    }
};

export const retrieveTemperatureValuesFromDb = async (db, startTime, endTime) => {
    try {
        return await db.all('SELECT * FROM temp_temperature_data WHERE timestamp BETWEEN ? AND ?', [startTime, endTime]);
    } catch (error) {
        console.error("Error retrieving temperature values from SQLite:", error);
        return [];
    }
};
