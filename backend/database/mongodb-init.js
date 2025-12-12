-- MongoDB Collections and Indexes for Algo Cloud IDE

// Switch to algo_logs database
use algo_logs;

// Application logs collection
db.createCollection("application_logs");

// User activity logs
db.createCollection("user_activity");

// Performance metrics
db.createCollection("performance_metrics");

// Container execution logs
db.createCollection("container_logs");

// Create indexes for better query performance

// Application logs indexes
db.application_logs.createIndex({ "timestamp": -1 });
db.application_logs.createIndex({ "level": 1, "timestamp": -1 });
db.application_logs.createIndex({ "userId": 1, "timestamp": -1 });

// User activity indexes
db.user_activity.createIndex({ "userId": 1, "timestamp": -1 });
db.user_activity.createIndex({ "action": 1, "timestamp": -1 });

// Performance metrics indexes
db.performance_metrics.createIndex({ "metric": 1, "timestamp": -1 });

// Container logs indexes
db.container_logs.createIndex({ "containerId": 1, "timestamp": -1 });
db.container_logs.createIndex({ "projectId": 1, "timestamp": -1 });

// Create TTL indexes for automatic cleanup (30 days)
db.application_logs.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 });
db.user_activity.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 });

print("MongoDB collections and indexes created successfully!");
