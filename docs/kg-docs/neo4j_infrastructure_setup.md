# Neo4j Database Infrastructure Setup Design

## Overview

This document outlines the design for setting up the Neo4j database infrastructure for the Clinical Corvus Knowledge Graph. The setup includes installation, configuration, security, backup, and monitoring strategies to ensure a robust, scalable, and secure graph database environment.

## Infrastructure Architecture

### Deployment Options

#### 1. Local Development Environment
- **Single Instance**: Neo4j Community Edition for development
- **Docker Container**: Containerized deployment for consistency
- **Embedded Mode**: For tight integration with applications

#### 2. Production Environment
- **Neo4j Aura (Recommended)**: Managed cloud service (Neo4j's official offering) with automated backups, patching, scaling, and HIPAA compliance
- **Self-managed Neo4j Enterprise Edition**: For clustering and advanced features with more control but higher operational burden
- **Cluster Deployment**: 3+ instances for high availability (for self-managed deployments)
- **Load Balancer**: For distributing read queries
- **Backup Server**: Dedicated backup instance

#### 3. Cloud Deployment Options
- **Neo4j Aura**: Managed cloud service (Neo4j's official offering)
- **AWS EC2**: Self-managed instances on Amazon Web Services
- **Azure VM**: Self-managed instances on Microsoft Azure
- **Google Cloud**: Self-managed instances on Google Cloud Platform

### Architecture Diagram

```
[Application Layer]
         ↓
[Load Balancer/API Gateway]
         ↓
   [Read Replicas]
         ↓
[Raft Leader] ← [Backup Server]
         ↓
[Monitoring & Alerting]
         ↓
[Logging & Audit]
```

*Note: In Neo4j 5 causal clustering, there is no single "write master". The cluster uses a Raft leader for coordination.*

## Installation and Setup

### Prerequisites

#### Hardware Requirements
```bash
# Minimum for Development
CPU: 2 cores
RAM: 4 GB
Disk Space: 20 GB SSD
Network: 1 Gbps

# Recommended for Production
CPU: 8+ cores
RAM: 32+ GB
Disk Space: 100+ GB NVMe SSD
Network: 10 Gbps
```

#### Software Requirements
```bash
# Operating Systems
Ubuntu 20.04 LTS or newer
CentOS 8 or newer
Windows Server 2019 or newer

# Dependencies
Java 11 or 17 (OpenJDK recommended)
Python 3.8+ for administration scripts
Docker 20+ (for containerized deployment)
```

### Installation Process

#### Option 1: Manual Installation (Linux)
```bash
# Download Neo4j
wget https://neo4j.com/artifact.php?name=neo4j-community-5.12.0-unix.tar.gz
tar -xf artifact.php?name=neo4j-community-5.12.0-unix.tar.gz
sudo mv neo4j-community-5.12.0 /opt/neo4j

# Set environment variables
echo 'export NEO4J_HOME=/opt/neo4j' >> ~/.bashrc
echo 'export PATH=$PATH:$NEO4J_HOME/bin' >> ~/.bashrc
source ~/.bashrc

# Install as service
sudo $NEO4J_HOME/bin/neo4j-admin service install
```

#### Option 2: Docker Installation
```dockerfile
# Dockerfile for Neo4j
FROM neo4j:5.12-community

# Copy custom configuration
COPY conf/neo4j.conf /var/lib/neo4j/conf/neo4j.conf
COPY conf/apoc.conf /var/lib/neo4j/conf/apoc.conf

# Expose ports
EXPOSE 7474 7687

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD cypher-shell -u neo4j -p ${NEO4J_AUTH:-neo4j/test} "RETURN 1" || exit 1

CMD ["neo4j"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  neo4j:
    image: neo4j:5.12-community
    container_name: clinical-corvus-neo4j
    ports:
      - "7474:7474"  # Browser interface
      - "7687:7687"  # Bolt protocol
    volumes:
      - ./data:/data
      - ./conf:/var/lib/neo4j/conf
      - ./plugins:/plugins
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
      - NEO4J_apoc_export_file_enabled=true
      - NEO4J_apoc_import_file_enabled=true
      - NEO4J_apoc_import_file_use__neo4j__config=true
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_server_memory_heap_initial__size=2G
      - NEO4J_server_memory_heap_max__size=4G
      - NEO4J_server_memory_pagecache_size=2G
    restart: unless-stopped
```

#### Option 3: Neo4j Aura (Cloud)
```bash
# Provision Neo4j Aura instance
# This would be done through Neo4j Aura console
# https://console.neo4j.io/

# Connection details would be provided by the service
# Connection string format: neo4j+s://<instance-id>.databases.neo4j.io
```

## Configuration

### Core Configuration Settings

#### neo4j.conf
```properties
# Basic Configuration
dbms.default_database=clinicalkg
dbms.connector.bolt.enabled=true
dbms.connector.bolt.listen_address=:7687
dbms.connector.http.enabled=true
dbms.connector.http.listen_address=:7474
dbms.connector.https.enabled=false

# Memory Settings
server.memory.heap.initial_size=2G
server.memory.heap.max_size=4G
server.memory.pagecache.size=2G

# Performance Tuning
dbms.transaction.timeout=60s
dbms.logs.query.enabled=true
dbms.logs.query.parameter_logging_enabled=true
dbms.logs.query.threshold=1s

# Slow query log rotation to avoid disk flooding
dbms.logs.query.rotation.keep_number=10
dbms.logs.query.rotation.size=100M

# Security Settings
dbms.security.auth_enabled=true
# Use tight allowlist instead of unrestricted apoc.* for security
dbms.security.procedures.allowlist=apoc.coll.*,apoc.convert.*,apoc.create.*,apoc.cypher.*,apoc.date.*,apoc.diff.*,apoc.export.*,apoc.graph.*,apoc.import.*,apoc.index.*,apoc.load.*,apoc.map.*,apoc.merge.*,apoc.meta.*,apoc.node.*,apoc.number.*,apoc.path.*,apoc.refactor.*,apoc.schema.*,apoc.search.*,apoc.spatial.*,apoc.string.*,apoc.temporal.*,apoc.text.*,apoc.trigger.*,apoc.tsc.*,apoc.util.*,apoc.uuid.*,apoc.vect.*

# Vault/KMS integration for password management
# Store passwords in HashiCorp Vault or AWS KMS instead of plain text
# Example using environment variables injected from Vault
# dbms.connector.bolt.listen_address=:7687
# dbms.connector.http.listen_address=:7474

# Network Settings
dbms.connectors.default_listen_address=0.0.0.0
dbms.default_advertised_address=localhost

# Logging
dbms.logs.debug.level=INFO
dbms.logs.gc.enabled=true
dbms.logs.query.plan_description_enabled=true

# Backup Settings
dbms.backup.enabled=true
dbms.backup.listen_address=0.0.0.0:6362

# Encrypted backups at rest for HIPAA/GDPR compliance
dbms.backup.ssl_policy=backup
dbms.ssl.policy.backup.enabled=true
dbms.ssl.policy.backup.base_directory=certificates/backup
dbms.ssl.policy.backup.private_key=private.key
dbms.ssl.policy.backup.public_certificate=public.crt

# Cluster Settings (Enterprise)
dbms.mode=SINGLE
causal_clustering.minimum_core_cluster_size_at_formation=3
causal_clustering.discovery_type=LIST

# TLS for intra-cluster traffic (required for security)
causal_clustering.enable_ssl=true
dbms.ssl.policy.cluster.enabled=true
dbms.ssl.policy.cluster.base_directory=certificates/cluster
dbms.ssl.policy.cluster.private_key=private.key
dbms.ssl.policy.cluster.public_certificate=public.crt
```

### APOC Plugin Configuration

#### apoc.conf
```properties
# APOC Configuration for Clinical Corvus
apoc.export.file.enabled=true
apoc.import.file.enabled=true
apoc.import.file.use_neo4j_config=true
apoc.trigger.enabled=true
apoc.uuid.enabled=true
apoc.spatial.geocode.provider=opencage
apoc.spatial.geocode.provider.opencage.key=${OPENCAGE_API_KEY}

# Security Settings
# Use tight allowlist for security instead of unrestricted access
apoc.security.allowlist_procedures=apoc.coll.*,apoc.convert.*,apoc.create.*,apoc.cypher.*,apoc.date.*,apoc.diff.*,apoc.export.*,apoc.graph.*,apoc.import.*,apoc.index.*,apoc.load.*,apoc.map.*,apoc.merge.*,apoc.meta.*,apoc.node.*,apoc.number.*,apoc.path.*,apoc.refactor.*,apoc.schema.*,apoc.search.*,apoc.spatial.*,apoc.string.*,apoc.temporal.*,apoc.text.*,apoc.trigger.*,apoc.tsc.*,apoc.util.*,apoc.uuid.*,apoc.vect.*
# Remove unrestricted setting for security
# apoc.security.unrestricted_procedures=apoc.*  # REMOVED for security

# Export/Import Settings
apoc.export.file.directory=/data/export
apoc.import.file.directory=/data/import
```

### Custom Plugins

#### Required Plugins
```bash
# APOC (Awesome Procedures on Cypher)
# Essential for graph algorithms, data integration, and utility functions
# Download from: https://github.com/neo4j/apoc/releases

# GDSL (Graph Data Science Library)
# For advanced graph algorithms and machine learning
# Download from: https://neo4j.com/product/graph-data-science-library/

# Neosemantics (n10s)
# For RDF and ontology integration
# Download from: https://github.com/neo4j-labs/neosemantics
```

## Security Configuration

### Authentication and Authorization

#### User Management
```cypher
// Create roles for different access levels
CREATE ROLE kg_reader;
CREATE ROLE kg_writer;
CREATE ROLE kg_admin;

// Grant permissions
GRANT ACCESS ON DATABASE clinicalkg TO kg_reader;
GRANT MATCH {*} ON GRAPH clinicalkg NODES * TO kg_reader;
GRANT MATCH {*} ON GRAPH clinicalkg RELATIONSHIPS * TO kg_reader;

GRANT WRITE ON DATABASE clinicalkg TO kg_writer;
GRANT CREATE INDEX ON DATABASE clinicalkg TO kg_writer;
GRANT DROP INDEX ON DATABASE clinicalkg TO kg_writer;

GRANT ALL DBMS PRIVILEGES ON DATABASE clinicalkg TO kg_admin;
GRANT TRANSACTION MANAGEMENT ON DATABASE clinicalkg TO kg_admin;

// Create users
CREATE USER reader_user SET PASSWORD 'secure_password_123';
CREATE USER writer_user SET PASSWORD 'secure_password_456';
CREATE USER admin_user SET PASSWORD 'secure_password_789';

// Assign roles to users
GRANT ROLE kg_reader TO reader_user;
GRANT ROLE kg_writer TO writer_user;
GRANT ROLE kg_admin TO admin_user;
```

#### HIPAA/GDPR Compliance Review
```cypher
// Regular access control review for compliance
// Check for excessive privileges
SHOW ROLES YIELD role
WITH role
MATCH (u:User)-[:HAS_ROLE]->(r:Role {name: role})
WHERE role IN ['admin', 'kg_admin']
RETURN u.name, r.name, count(*) AS privilege_count
ORDER BY privilege_count DESC;

// Review access to sensitive data
SHOW PRIVILEGES AS REVOKE
YIELD action, resource, graph, segment, role
WHERE resource = 'NODE(*)' AND action = 'READ'
RETURN role, action, resource, graph, segment;

// Check for unused accounts
SHOW USERS YIELD user, suspended, passwordChangeRequired
WHERE suspended = false
MATCH (u:User {name: user})
WHERE u.lastLogin < (datetime() - duration({days: 90}))
RETURN user, u.lastLogin
ORDER BY u.lastLogin ASC;
```

#### LDAP Integration (Enterprise)
```properties
# LDAP Configuration in neo4j.conf
dbms.security.ldap.authentication.user_dn_template=uid={0},ou=users,dc=example,dc=com
dbms.security.ldap.authorization.system_username=cn=admin,dc=example,dc=com
dbms.security.ldap.authorization.system_password=secret
dbms.security.ldap.authorization.use_system_account=true
dbms.security.ldap.authorization.search_base=ou=roles,dc=example,dc=com
dbms.security.ldap.authorization.search_filter=(&(objectClass=groupOfNames)(member={0}))
dbms.security.ldap.authorization.attribute_names=cn
```

#### SSL/TLS Configuration
```properties
# Enable HTTPS
dbms.connector.https.enabled=true
dbms.connector.https.listen_address=:7473

# SSL Certificate Configuration
dbms.ssl.policy.bolt.enabled=true
dbms.ssl.policy.bolt.base_directory=certificates/bolt
dbms.ssl.policy.bolt.private_key=private.key
dbms.ssl.policy.bolt.public_certificate=public.crt

# HTTPS Policy
dbms.ssl.policy.https.enabled=true
dbms.ssl.policy.https.base_directory=certificates/https
dbms.ssl.policy.https.private_key=private.key
dbms.ssl.policy.https.public_certificate=public.crt
```

#### Vault/KMS Integration for Password Management
```bash
# Example script to retrieve passwords from HashiCorp Vault
#!/bin/bash

# Authenticate with Vault
export VAULT_ADDR="https://vault.example.com:8200"
export VAULT_TOKEN=$(vault login -method=approle role_id=$ROLE_ID secret_id=$SECRET_ID)

# Retrieve Neo4j passwords
NEO4J_PASSWORD=$(vault kv get -field=password secret/neo4j/admin)
NEO4J_BACKUP_PASSWORD=$(vault kv get -field=password secret/neo4j/backup)

# Export as environment variables
export NEO4J_AUTH="neo4j/${NEO4J_PASSWORD}"
export NEO4J_BACKUP_AUTH="backup_user/${NEO4J_BACKUP_PASSWORD}"

# Start Neo4j with retrieved credentials
neo4j start
```

```properties
# Neo4j configuration using environment variables
# In neo4j.conf
dbms.security.auth_enabled=true

# Use environment variables for passwords
# The actual passwords are retrieved from Vault/KMS at runtime
dbms.authenticator.realm=default

# Backup authentication
dbms.backup.auth.enabled=true
```

#### SIEM Integration for Query Logs
```bash
# Forward Neo4j query logs to SIEM (Splunk, Elastic, etc.)
# Example for forwarding to Splunk using splunk-forwarder

# Configure log forwarding in Splunk Universal Forwarder
# /opt/splunkforwarder/etc/system/local/inputs.conf
[monitor:///var/log/neo4j/query.log]
index = neo4j-queries
sourcetype = neo4j:query

# Example for forwarding to Elasticsearch using Filebeat
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/neo4j/query.log
  fields:
    log_type: neo4j_query
  fields_under_root: true

# Log rotation to prevent disk flooding
# /etc/logrotate.d/neo4j-query
/var/log/neo4j/query.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 neo4j neo4j
}
```

### Firewall and Network Security
```bash
# UFW Firewall Rules
ufw allow from 192.168.1.0/24 to any port 7687
ufw allow from 192.168.1.0/24 to any port 7474
ufw allow from 10.0.0.0/8 to any port 6362  # Backup port
ufw deny from any to any port 7473  # HTTPS (only if needed)

# iptables equivalent
iptables -A INPUT -p tcp --dport 7687 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 7474 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 6362 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 7473 -j DROP
```

## Backup and Recovery

### Backup Strategy

#### Full Backup
```bash
# Online backup (Enterprise only)
neo4j-admin backup --backup-dir=/backups --name=clinicalkg-backup

# Offline backup (Community)
neo4j stop
rsync -av /var/lib/neo4j/data/databases/clinicalkg/ /backups/offline-backup/
neo4j start
```

#### Incremental Backup
```bash
# Incremental backup schedule
#!/bin/bash
# Daily incremental backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/incremental"
mkdir -p $BACKUP_DIR/$DATE

neo4j-admin dump --database=clinicalkg --to=$BACKUP_DIR/$DATE/clinicalkg.dump

# Remove backups older than 30 days
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} \;
```

#### Geo-Redundant Backups
```bash
# Offsite backup script for geo-redundancy
#!/bin/bash
BACKUP_DIR="/backups"
OFFSITE_STORAGE="s3://clinical-corvus-backups"

# Sync backups to offsite storage
aws s3 sync $BACKUP_DIR $OFFSITE_STORAGE --storage-class STANDARD_IA

# Verify sync
if [ $? -eq 0 ]; then
    echo "Offsite backup sync completed successfully"
else
    echo "Offsite backup sync failed"
    # Send alert
fi
```

#### Backup Integrity Verification
```bash
# Verify backup integrity after each backup
neo4j-admin check-consistency --backup-path=/backups/clinicalkg-backup --database=clinicalkg

# Automated backup verification script
#!/bin/bash
BACKUP_PATH="/backups/clinicalkg-backup"
DATABASE="clinicalkg"

# Run consistency check
neo4j-admin check-consistency --backup-path=$BACKUP_PATH --database=$DATABASE

# Check exit code
if [ $? -eq 0 ]; then
    echo "Backup integrity check passed"
else
    echo "Backup integrity check failed"
    # Send alert
    # Alerting code here
fi
```

#### Point-in-Time Recovery
```bash
# Restore from backup
neo4j stop
rm -rf /var/lib/neo4j/data/databases/clinicalkg/*
neo4j-admin load --from=/backups/clinicalkg-backup --database=clinicalkg
neo4j start
```

### Disaster Recovery Plan

#### Recovery Time Objective (RTO)
- **Critical System**: < 4 hours
- **Standard System**: < 24 hours
- **Development System**: < 72 hours

#### Recovery Point Objective (RPO)
- **Critical Data**: < 1 hour
- **Standard Data**: < 24 hours
- **Archived Data**: < 7 days

#### Failover Process
```bash
#!/bin/bash
# Automated failover script
PRIMARY_HOST="neo4j-primary.example.com"
STANDBY_HOST="neo4j-standby.example.com"

# Check if primary is responsive
if ! nc -z $PRIMARY_HOST 7687; then
    echo "Primary server is down, initiating failover..."
    
    # Promote standby to primary
    ssh $STANDBY_HOST "neo4j-admin cluster promote"
    
    # Update DNS/load balancer
    # This would depend on your specific setup
    
    # Send alert
    curl -X POST "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" \
         -H "Content-Type: application/json" \
         -d '{"text":"Neo4j failover initiated. Standby promoted to primary."}'
else
    echo "Primary server is responsive"
fi
```

## Monitoring and Alerting

### Performance Monitoring

#### Key Metrics to Monitor
```bash
# System-level metrics
CPU usage
Memory usage
Disk I/O
Network throughput
Disk space usage

# Neo4j-specific metrics
Transaction count
Query response time
Active connections
Page cache hit ratio
Query plan cache hit ratio
Garbage collection time
```

#### OpenTelemetry Integration
```properties
# Enable OpenTelemetry for distributed tracing
# Requires OpenTelemetry agent to be installed
dbms.tracer.enabled=true
dbms.tracer.impersonation.enabled=true

# OpenTelemetry exporter configuration
otel.traces.exporter=otlp
otel.exporter.otlp.endpoint=http://otel-collector:4317
otel.service.name=neo4j-clinical-corvus
```

#### Prometheus Integration
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'neo4j'
    static_configs:
      - targets: ['localhost:2004']
    scrape_interval: 15s
```

```properties
# Enable Prometheus metrics in neo4j.conf
metrics.enabled=true
metrics.filter=*
metrics.csv.interval=5s
metrics.prometheus.enabled=true
metrics.prometheus.endpoint=0.0.0.0:2004
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Neo4j Clinical Corvus Monitoring",
    "panels": [
      {
        "title": "Query Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "neo4j_transaction_active_read_count",
            "legendFormat": "Active Reads"
          },
          {
            "expr": "neo4j_transaction_active_write_count",
            "legendFormat": "Active Writes"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "gauge",
        "targets": [
          {
            "expr": "neo4j_memory_heap_used / neo4j_memory_heap_max",
            "legendFormat": "Heap Usage %"
          }
        ]
      },
      {
        "title": "Page Cache Hit Ratio",
        "type": "singlestat",
        "targets": [
          {
            "expr": "neo4j_page_cache_hit_ratio",
            "legendFormat": "Hit Ratio"
          }
        ]
      }
    ]
  }
}
```

### Health Checks

#### Basic Health Check
```bash
#!/bin/bash
# Simple health check script
HEALTH_CHECK_URL="http://localhost:7474/db/neo4j/tx/commit"
AUTH_HEADER="Authorization: Basic $(echo -n 'neo4j:test' | base64)"

# Check if Neo4j is responding
curl -s -H "$AUTH_HEADER" \
     -H "Content-Type: application/json" \
     -d '{"statements":[{"statement":"RETURN 1"}]}' \
     $HEALTH_CHECK_URL > /dev/null

if [ $? -eq 0 ]; then
    echo "Neo4j is healthy"
    exit 0
else
    echo "Neo4j health check failed"
    exit 1
fi
```

#### Advanced Health Check
```python
# Python health check script
import requests
import json
import sys
from datetime import datetime

def health_check():
    url = "http://localhost:7474/db/neo4j/tx/commit"
    headers = {
        "Authorization": "Basic " + "bmVvNGo6dGVzdA==",  # neo4j:test base64 encoded
        "Content-Type": "application/json"
    }
    
    # Test queries
    test_queries = [
        "RETURN 1 AS test",
        "MATCH (n) RETURN count(n) AS node_count",
        "MATCH ()-[r]->() RETURN count(r) AS rel_count LIMIT 1"
    ]
    
    results = []
    for i, query in enumerate(test_queries):
        payload = {"statements": [{"statement": query}]}
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                results.append({"query": i, "status": "success"})
            else:
                results.append({
                    "query": i, 
                    "status": "failure", 
                    "error": f"HTTP {response.status_code}"
                })
        except Exception as e:
            results.append({"query": i, "status": "failure", "error": str(e)})
    
    # Overall health
    success_count = sum(1 for r in results if r["status"] == "success")
    health_score = success_count / len(test_queries)
    
    return {
        "timestamp": datetime.now().isoformat(),
        "health_score": health_score,
        "details": results,
        "overall_status": "healthy" if health_score >= 0.8 else "degraded"
    }

if __name__ == "__main__":
    result = health_check()
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["overall_status"] == "healthy" else 1)
```

### Alerting System

#### Alert Rules
```yaml
# Alerting rules for Prometheus
groups:
  - name: neo4j.alerts
    rules:
      - alert: Neo4jDown
        expr: up{job="neo4j"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Neo4j instance is down"
          description: "Neo4j instance {{ $labels.instance }} has been down for more than 1 minute."

      - alert: HighQueryLatency
        expr: histogram_quantile(0.95, rate(neo4j_transaction_tx_time_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High query latency detected"
          description: "95th percentile query latency is above 2 seconds."

      - alert: LowPageCacheHitRatio
        expr: neo4j_page_cache_hit_ratio < 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low page cache hit ratio"
          description: "Page cache hit ratio is below 80%, consider increasing page cache size."
```

## High Availability and Clustering

### Cluster Architecture (Enterprise)

#### Core Servers
```properties
# Core server configuration (neo4j.conf)
dbms.mode=CORE
causal_clustering.minimum_core_cluster_size_at_formation=3
causal_clustering.minimum_core_cluster_size_at_runtime=3
causal_clustering.initial_discovery_members=core1:5000,core2:5000,core3:5000
causal_clustering.discovery_type=LIST
```

#### Read Replica Servers
```properties
# Read replica configuration (neo4j.conf)
dbms.mode=READ_REPLICA
causal_clustering.initial_discovery_members=core1:5000,core2:5000,core3:5000
```

#### Load Balancer Configuration
```nginx
# NGINX load balancer configuration
upstream neo4j_cluster {
    server core1:7687 weight=3;
    server core2:7687 weight=3;
    server core3:7687 weight=3;
    server replica1:7687 weight=2;
    server replica2:7687 weight=2;
}

server {
    listen 7687;
    
    location / {
        proxy_pass neo4j_cluster;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Read/Write Workload Routing
```java
// Java driver configuration for read/write routing
import org.neo4j.driver.*;

// Configure driver with access mode routing
Driver driver = GraphDatabase.driver(
    "neo4j://cluster.example.com:7687",
    AuthTokens.basic("username", "password"),
    Config.builder()
        .withRoutingDisabled(false)
        .build()
);

// Write queries - route to leader
try (Session session = driver.session(SessionConfig.builder()
    .withDefaultAccessMode(AccessMode.WRITE)
    .build())) {
    session.run("CREATE (n:Node {name: 'example'})");
}

// Read queries - route to replicas
try (Session session = driver.session(SessionConfig.builder()
    .withDefaultAccessMode(AccessMode.READ)
    .build())) {
    Result result = session.run("MATCH (n:Node) RETURN n LIMIT 10");
    // Process results
}
```

### Failover Testing

#### Chaos Engineering
```bash
#!/bin/bash
# Chaos engineering script to test failover
echo "Starting chaos engineering test..."

# Randomly kill a core server every 30 minutes
while true; do
    sleep 1800  # 30 minutes
    
    # Select random core server
    CORE_SERVER=$(shuf -n1 -e core1 core2 core3)
    
    echo "Killing $CORE_SERVER for failover test..."
    ssh $CORE_SERVER "systemctl stop neo4j"
    
    # Wait for failover
    sleep 60
    
    # Restart server
    ssh $CORE_SERVER "systemctl start neo4j"
    
    echo "Failover test completed for $CORE_SERVER"
done
```

## Performance Tuning

### Memory Configuration

#### Heap Size
```properties
# Optimal heap size calculation
# For systems with 32GB RAM:
# Heap: 8-12GB (25-37% of total RAM)
# Page cache: 12-16GB (37-50% of total RAM)
server.memory.heap.initial_size=8G
server.memory.heap.max_size=12G
server.memory.pagecache.size=16G
```

#### Garbage Collection
```properties
# JVM GC tuning for Neo4j
dbms.jvm.additional=-XX:+UseG1GC
dbms.jvm.additional=-XX:G1HeapRegionSize=32m
dbms.jvm.additional=-XX:+UnlockExperimentalVMOptions
dbms.jvm.additional=-XX:MaxGCPauseMillis=500
dbms.jvm.additional=-XX:G1NewSizePercent=20
dbms.jvm.additional=-XX:G1MaxNewSizePercent=30

# Consider ZGC for low-latency workloads (Java 17+)
# dbms.jvm.additional=-XX:+UseZGC
# dbms.jvm.additional=-XX:+UnlockExperimentalVMOptions

#### Query Cache Warmup
```cypher
// Warm up query cache after restart
// Run critical queries to populate cache
MATCH (d:Disease)-[r:TREATS]->(dr:Drug)
RETURN count(*) AS relationship_count;

MATCH (d:Disease)-[r:CAUSES]->(s:Symptom)
RETURN count(*) AS relationship_count;

MATCH (d:Disease)
WHERE d.category = 'Infectious'
RETURN count(*) AS disease_count;

// Automated warmup script
#!/bin/bash
# Query cache warmup script
WARMUP_QUERIES="
MATCH (d:Disease)-[r:TREATS]->(dr:Drug) RETURN count(*);
MATCH (d:Disease)-[r:CAUSES]->(s:Symptom) RETURN count(*);
MATCH (d:Disease) WHERE d.category = 'Infectious' RETURN count(*);
"

echo "$WARMUP_QUERIES" | cypher-shell -u neo4j -p ${NEO4J_PASSWORD}
```
```

### Query Optimization

#### Index Optimization
```cypher
// Create composite indexes for frequently queried combinations
CREATE INDEX disease_name_category FOR (d:Disease) ON (d.name, d.category);
CREATE INDEX drug_name_category FOR (d:Drug) ON (d.name, d.category);
CREATE INDEX symptom_name_body_system FOR (s:Symptom) ON (s.name, s.body_system);

// Create lookup indexes for foreign keys
CREATE INDEX disease_umls_id FOR (d:Disease) ON (d.umls_id);
CREATE INDEX drug_rxnorm_id FOR (d:Drug) ON (d.rxnorm_id);
CREATE INDEX symptom_snomed_id FOR (s:Symptom) ON (s.snomed_id);
```

#### Query Hints
```cypher
// Use index hints for performance-critical queries
MATCH (d:Disease)
USING INDEX d:Disease(name)
WHERE d.name CONTAINS 'diabetes'
RETURN d;

// Use scan hints when appropriate
MATCH (d:Disease)
USING SCAN d:Disease
WHERE d.prevalence > 0.05
RETURN d;
```

#### Fulltext Indexes for Entity Search
```cypher
// Create fulltext indexes for medical entity search
CALL db.index.fulltext.createNodeIndex(
  'disease_fulltext',
  ['Disease'],
  ['name', 'description', 'synonyms']
);

CALL db.index.fulltext.createNodeIndex(
  'drug_fulltext',
  ['Drug'],
  ['name', 'description', 'synonyms']
);

CALL db.index.fulltext.createNodeIndex(
  'symptom_fulltext',
  ['Symptom'],
  ['name', 'description']
);

// Example query using fulltext search
CALL db.index.fulltext.queryNodes('disease_fulltext', 'diabetes mellitus')
YIELD node, score
RETURN node.name, node.description, score
ORDER BY score DESC
LIMIT 10;
```

## Data Migration and Integration

### Initial Data Load

#### Bulk Import Process
```bash
# Prepare CSV files for bulk import
# nodes.csv
id:ID,name,:LABEL
1,Diabetes,Disease
2,Insulin,Drug

# relationships.csv
:START_ID,:END_ID,:TYPE,confidence:float
1,2,TREATS,0.95

# Import data
neo4j-admin database import full clinicalkg --nodes=nodes.csv --relationships=relationships.csv

#### Data Validation Layer
```python
# Data validation before ingestion
import re
from typing import Dict, List, Tuple

class DataValidator:
    def __init__(self):
        # SNOMED CT ID pattern
        self.snomed_pattern = re.compile(r'^\d{6,18}$')
        # UMLS CUI pattern
        self.umls_pattern = re.compile(r'^C\d{7}$')
        # RxNorm ID pattern
        self.rxnorm_pattern = re.compile(r'^\d{1,8}$')
    
    def validate_entity(self, entity: Dict) -> Tuple[bool, List[str]]:
        """Validate entity before ingestion."""
        errors = []
        
        # Check required fields
        if 'id' not in entity:
            errors.append("Missing required field: id")
        
        # Validate ontology IDs
        if 'snomed_id' in entity and not self.snomed_pattern.match(entity['snomed_id']):
            errors.append(f"Invalid SNOMED CT ID: {entity['snomed_id']}")
        
        if 'umls_id' in entity and not self.umls_pattern.match(entity['umls_id']):
            errors.append(f"Invalid UMLS CUI: {entity['umls_id']}")
        
        if 'rxnorm_id' in entity and not self.rxnorm_pattern.match(entity['rxnorm_id']):
            errors.append(f"Invalid RxNorm ID: {entity['rxnorm_id']}")
        
        # Check for duplicate relationships
        if 'relationships' in entity:
            seen_rels = set()
            for rel in entity['relationships']:
                rel_key = (rel['target_id'], rel['type'])
                if rel_key in seen_rels:
                    errors.append(f"Duplicate relationship: {rel_key}")
                else:
                    seen_rels.add(rel_key)
        
        return len(errors) == 0, errors
```

#### Provenance Tracking
```python
# Add provenance tracking to data loading
class ProvenanceTracker:
    def __init__(self, driver):
        self.driver = driver
    
    def add_provenance(self, entity_id: str, source_document: str, extraction_timestamp: str):
        """Add provenance relationship to entity."""
        with self.driver.session() as session:
            session.run("""
                MATCH (e {id: $entity_id})
                MERGE (s:SourceDocument {url: $source_document})
                MERGE (e)-[:EXTRACTED_FROM]->(s)
                SET s.extraction_timestamp = $extraction_timestamp
            """, {
                "entity_id": entity_id,
                "source_document": source_document,
                "extraction_timestamp": extraction_timestamp
            })

# Example usage in data loading pipeline
def load_entities_with_provenance(entities: List[Dict], source_document: str):
    """Load entities with provenance tracking."""
    validator = DataValidator()
    tracker = ProvenanceTracker(driver)
    
    for entity in entities:
        # Validate entity
        is_valid, errors = validator.validate_entity(entity)
        if not is_valid:
            print(f"Validation errors for entity {entity.get('id', 'unknown')}: {errors}")
            continue
        
        # Load entity (existing code)
        # ...
        
        # Add provenance
        tracker.add_provenance(
            entity['id'],
            source_document,
            datetime.now().isoformat()
        )
```
```

#### Incremental Data Loading
```python
# Python script for incremental data loading
import neo4j
from typing import List, Dict
import asyncio

class KGDataLoader:
    def __init__(self, uri: str, username: str, password: str):
        self.driver = neo4j.GraphDatabase.driver(uri, auth=(username, password))
    
    async def load_entities(
        self,
        entities: List[Dict],
        entity_type: str
    ):
        """Load entities into the knowledge graph."""
        async with self.driver.session() as session:
            # Batch insert for performance
            batch_size = 1000
            for i in range(0, len(entities), batch_size):
                batch = entities[i:i + batch_size]
                await self._insert_entity_batch(session, batch, entity_type)
    
    async def _insert_entity_batch(
        self,
        session,
        entities: List[Dict],
        entity_type: str
    ):
        """Insert a batch of entities."""
        # Build Cypher query for batch insert
        query = f"""
        UNWIND $entities AS entity
        MERGE (e:{entity_type} {{id: entity.id}})
        SET e += entity
        """
        
        await session.run(query, entities=entities)
    
    async def load_relationships(
        self,
        relationships: List[Dict],
        relationship_type: str
    ):
        """Load relationships into the knowledge graph."""
        async with self.driver.session() as session:
            # Batch insert for performance
            batch_size = 1000
            for i in range(0, len(relationships), batch_size):
                batch = relationships[i:i + batch_size]
                await self._insert_relationship_batch(session, batch, relationship_type)
    
    async def _insert_relationship_batch(
        self,
        session,
        relationships: List[Dict],
        relationship_type: str
    ):
        """Insert a batch of relationships."""
        # Build Cypher query for batch insert
        query = f"""
        UNWIND $relationships AS rel
        MATCH (source {{id: rel.source_id}})
        MATCH (target {{id: rel.target_id}})
        MERGE (source)-[r:{relationship_type}]->(target)
        SET r += rel.properties
        """
        
        await session.run(query, relationships=relationships)
```

### Integration with External Systems

#### ETL Pipeline
```python
# ETL pipeline for integrating external medical databases
import requests
import asyncio
from typing import Dict, List

class MedicalDataETL:
    def __init__(self, kg_loader: KGDataLoader):
        self.kg_loader = kg_loader
    
    async def extract_mesh_data(self):
        """Extract data from MeSH database."""
        # MeSH API endpoint
        mesh_url = "https://meshb.nlm.nih.gov/api/search"
        
        # Extract descriptors
        response = requests.get(f"{mesh_url}/descriptor")
        descriptors = response.json()
        
        # Transform to KG format
        entities = []
        for desc in descriptors:
            entity = {
                "id": desc["ui"],
                "name": desc["name"],
                "description": desc["scopeNote"],
                "mesh_id": desc["ui"],
                "synonyms": desc.get("synonyms", []),
                "tree_numbers": desc.get("treeNumbers", [])
            }
            entities.append(entity)
        
        # Load into KG
        await self.kg_loader.load_entities(entities, "MedicalConcept")
    
    async def extract_umls_data(self):
        """Extract data from UMLS database."""
        # UMLS API endpoint
        umls_url = "https://uts-ws.nlm.nih.gov/rest"
        
        # Extract concepts
        response = requests.get(f"{umls_url}/search/current")
        concepts = response.json()
        
        # Transform to KG format
        entities = []
        for concept in concepts["result"]["results"]:
            entity = {
                "id": concept["ui"],
                "name": concept["name"],
                "umls_id": concept["ui"],
                "definitions": concept.get("definitions", []),
                "semantic_types": concept.get("semanticTypes", [])
            }
            entities.append(entity)
        
        # Load into KG
        await self.kg_loader.load_entities(entities, "MedicalConcept")
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Weekly Maintenance Script
```bash
#!/bin/bash
# Weekly maintenance script for Neo4j
echo "Starting weekly Neo4j maintenance..."

# 1. Check disk space
echo "Checking disk space..."
df -h /var/lib/neo4j

# 2. Check database consistency
echo "Running consistency check..."
neo4j-admin check-consistency --database=clinicalkg

# 3. Rebuild indexes
echo "Rebuilding indexes..."
cypher-shell -u neo4j -p ${NEO4J_PASSWORD} << EOF
CALL db.indexes() YIELD name, state
WHERE state = 'FAILED'
CALL db.awaitIndex(name)
RETURN "Index rebuild completed";
EOF

# 4. Update statistics
echo "Updating query statistics..."
cypher-shell -u neo4j -p ${NEO4J_PASSWORD} << EOF
CALL db.stats.retrieve() YIELD data
WITH data
CALL db.stats.clear()
RETURN "Statistics updated";
EOF

# 5. Rotate logs
echo "Rotating logs..."
logrotate /etc/logrotate.d/neo4j

echo "Weekly maintenance completed."
```

#### Monthly Maintenance Script
```bash
#!/bin/bash
# Monthly maintenance script for Neo4j
echo "Starting monthly Neo4j maintenance..."

# 1. Full backup
echo "Creating full backup..."
neo4j-admin backup --backup-dir=/backups/monthly --name=clinicalkg-$(date +%Y%m)

# 2. Analyze query performance
echo "Analyzing slow queries..."
cypher-shell -u neo4j -p ${NEO4J_PASSWORD} << EOF
CALL dbms.listQueries()
YIELD query, elapsedTimeMillis
WHERE elapsedTimeMillis > 5000
RETURN query, elapsedTimeMillis
ORDER BY elapsedTimeMillis DESC;
EOF

# 3. Check for unused indexes
echo "Checking for unused indexes..."
cypher-shell -u neo4j -p ${NEO4J_PASSWORD} << EOF
SHOW INDEXES YIELD name, type, lastRead
WHERE lastRead IS NULL OR lastRead < (datetime() - duration({days: 30}))
RETURN name, type, lastRead;
EOF

# 4. Update plugins
echo "Checking for plugin updates..."
# This would depend on your plugin management strategy

echo "Monthly maintenance completed."
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Performance Issues
```bash
# Check for long-running queries
cypher-shell -u neo4j -p ${NEO4J_PASSWORD} << EOF
CALL dbms.listQueries()
YIELD query, elapsedTimeMillis, username
WHERE elapsedTimeMillis > 10000
RETURN username, query, elapsedTimeMillis
ORDER BY elapsedTimeMillis DESC;
EOF

# Kill problematic queries
cypher-shell -u neo4j -p ${NEO4J_PASSWORD} << EOF
CALL dbms.listQueries()
YIELD queryId, elapsedTimeMillis
WHERE elapsedTimeMillis > 60000
CALL dbms.killQuery(queryId)
RETURN "Query killed: " + queryId;
EOF
```

#### Memory Issues
```bash
# Check heap usage
jstat -gc $(pgrep -f neo4j) 1s 5

# Check page cache hit ratio
cypher-shell -u neo4j -p ${NEO4J_PASSWORD} << EOF
RETURN apoc.metrics.get("neo4j.page_cache.hit_ratio") AS hit_ratio;
EOF

# Adjust memory settings if needed
# Edit neo4j.conf and restart service
```

#### Connectivity Issues
```bash
# Check if Neo4j is listening on correct ports
netstat -tlnp | grep java

# Test connectivity
telnet localhost 7687
curl -v http://localhost:7474

# Check firewall rules
iptables -L -n | grep 7687
```

## Upgrade Process

### Version Upgrade Steps

#### Preparation
```bash
# 1. Backup current database
neo4j stop
neo4j-admin dump --database=clinicalkg --to=/backups/pre-upgrade.dump

# 2. Check compatibility
neo4j-admin check-consistency --database=clinicalkg

# 3. Review release notes for breaking changes
# Visit: https://neo4j.com/release-notes/
```

#### Upgrade Execution
```bash
# 4. Stop current Neo4j instance
systemctl stop neo4j

# 5. Install new version
# This depends on your installation method (package manager, tarball, etc.)

# 6. Migrate configuration files
cp /etc/neo4j.conf /etc/neo4j/neo4j.conf.backup
# Update configuration for new version

# 7. Start upgraded instance
systemctl start neo4j

# 8. Verify upgrade
cypher-shell -u neo4j -p ${NEO4J_PASSWORD} << EOF
RETURN "Neo4j " + apoc.version() AS version;
EOF
```

#### Post-Upgrade Verification
```cypher
// Check database integrity
CALL apoc.schema.assert({}, {});

// Verify indexes
SHOW INDEXES;

// Test critical queries
MATCH (d:Disease {name: 'Diabetes'}) RETURN d LIMIT 1;

// Check performance
PROFILE MATCH (d:Disease)-[r:TREATS]->(dr:Drug) 
RETURN count(*) AS relationship_count;
```

## Implementation Roadmap

### Phase 1: Development Environment
- [ ] Install Neo4j Community Edition locally
- [ ] Configure basic settings and security
- [ ] Load sample medical data
- [ ] Test basic queries and performance

### Phase 2: Production Environment
- [ ] Deploy Neo4j Enterprise Edition cluster
- [ ] Configure high availability and load balancing
- [ ] Implement backup and recovery procedures
- [ ] Set up monitoring and alerting

### Phase 3: Integration
- [ ] Integrate with Clinical Corvus application
- [ ] Implement data loading pipelines
- [ ] Configure security and access controls
- [ ] Test failover scenarios

### Phase 4: Optimization
- [ ] Tune performance for production workload
- [ ] Implement advanced monitoring
- [ ] Optimize queries and indexes
- [ ] Conduct stress testing

### Phase 5: Maintenance
- [ ] Establish regular maintenance procedures
- [ ] Train operations team
- [ ] Document troubleshooting procedures
- [ ] Implement disaster recovery testing

This Neo4j infrastructure setup design provides a comprehensive foundation for deploying and managing the Clinical Corvus Knowledge Graph database, ensuring scalability, reliability, and security for clinical data processing.