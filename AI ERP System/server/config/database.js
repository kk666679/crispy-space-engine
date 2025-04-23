// server/config/database.js
const mongoose = require('mongoose');
const EventEmitter = require('events');

class DatabaseService extends EventEmitter {
    constructor() {
        super();
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.lastReconnectAttempt = null;

        // Default configuration
        this.config = {
            maxRetries: process.env.MONGO_MAX_RETRIES || 5,
            retryDelay: process.env.MONGO_RETRY_DELAY || 5000,
            connectTimeoutMS: process.env.MONGO_CONNECT_TIMEOUT || 30000,
            heartbeatFrequencyMS: process.env.MONGO_HEARTBEAT_FREQUENCY || 10000,
            socketTimeoutMS: process.env.MONGO_SOCKET_TIMEOUT || 45000,
        };

        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.handleConnectionError = this.handleConnectionError.bind(this);

        // Setup mongoose event listeners
        this.setupMongooseListeners();
    }

    setupMongooseListeners() {
        mongoose.connection.on('connected', () => {
            this.isConnected = true;
            this.connectionAttempts = 0;
            this.emit('connected');
            console.log('MongoDB connection established');
        });

        mongoose.connection.on('disconnected', () => {
            this.isConnected = false;
            this.emit('disconnected');
            console.log('MongoDB connection disconnected');
        });

        mongoose.connection.on('error', (err) => {
            this.emit('error', err);
            console.error('MongoDB connection error:', err);
        });

        // Handle process termination
        process.on('SIGINT', this.handleProcessTermination.bind(this));
        process.on('SIGTERM', this.handleProcessTermination.bind(this));
    }

    async connect() {
        let retries = this.config.maxRetries;

        while (retries > 0) {
            try {
                this.connectionAttempts++;
                this.lastReconnectAttempt = new Date();

                // Validate MongoDB URI
                if (!process.env.MONGO_URI) {
                    throw new Error('MONGO_URI environment variable is not defined');
                }

                // Configure mongoose connection options
                const mongooseOptions = {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    connectTimeoutMS: this.config.connectTimeoutMS,
                    heartbeatFrequencyMS: this.config.heartbeatFrequencyMS,
                    socketTimeoutMS: this.config.socketTimeoutMS,
                    serverSelectionTimeoutMS: this.config.connectTimeoutMS,
                    maxPoolSize: process.env.MONGO_MAX_POOL_SIZE || 10,
                    minPoolSize: process.env.MONGO_MIN_POOL_SIZE || 1,
                    autoIndex: process.env.NODE_ENV !== 'production', // Disable auto-indexing in production
                };

                // Attempt to connect
                await mongoose.connect(process.env.MONGO_URI, mongooseOptions);

                // Monitor connection health
                this.startHealthCheck();

                return;

            } catch (err) {
                await this.handleConnectionError(err, retries);
                retries--;
            }
        }

        this.emit('maxRetriesExceeded');
        console.error('Maximum connection retries exceeded. Exiting process.');
        process.exit(1);
    }

    async handleConnectionError(err, remainingRetries) {
        const attemptNumber = this.config.maxRetries - remainingRetries + 1;
        
        console.error(`MongoDB connection error (attempt ${attemptNumber} of ${this.config.maxRetries}):`, {
            error: err.message,
            timestamp: new Date().toISOString(),
            remainingRetries,
            connectionAttempts: this.connectionAttempts
        });

        if (remainingRetries > 0) {
            console.log(`Retrying in ${this.config.retryDelay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
    }

    startHealthCheck() {
        setInterval(async () => {
            try {
                if (this.isConnected) {
                    // Perform a simple operation to check connection health
                    await mongoose.connection.db.admin().ping();
                    this.emit('healthCheck', { status: 'healthy' });
                }
            } catch (err) {
                this.emit('healthCheck', { status: 'unhealthy', error: err.message });
                console.error('Database health check failed:', err);

                // Attempt reconnection if necessary
                if (!this.isConnected) {
                    this.connect();
                }
            }
        }, this.config.heartbeatFrequencyMS);
    }

    async disconnect() {
        try {
            await mongoose.disconnect();
            console.log('MongoDB disconnected successfully');
        } catch (err) {
            console.error('Error while disconnecting from MongoDB:', err);
            throw err;
        }
    }

    async handleProcessTermination() {
        console.log('Process termination signal received. Closing MongoDB connection...');
        try {
            await this.disconnect();
            process.exit(0);
        } catch (err) {
            console.error('Error during graceful shutdown:', err);
            process.exit(1);
        }
    }

    // Utility methods for connection status
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            connectionAttempts: this.connectionAttempts,
            lastReconnectAttempt: this.lastReconnectAttempt,
            readyState: mongoose.connection.readyState
        };
    }
}

// Create and export database service instance
const databaseService = new DatabaseService();

module.exports = databaseService;

// Usage example:
/*
// server.js or app.js
const databaseService = require('./config/database');

// Event listeners
databaseService.on('connected', () => {
    console.log('Application connected to MongoDB');
});

databaseService.on('disconnected', () => {
    console.log('Application disconnected from MongoDB');
});

databaseService.on('error', (err) => {
    console.error('Database error:', err);
});

databaseService.on('healthCheck', (status) => {
    console.log('Database health status:', status);
});

// Connect to database
databaseService.connect()
    .catch(err => {
        console.error('Failed to establish initial connection:', err);
        process.exit(1);
    });
*/
