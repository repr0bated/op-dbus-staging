#!/usr/bin/env node
/**
 * Helper script to create observations in MCP memory server
 * Usage: node create-observation.js "observation text" [entityName]
 */

const http = require('http');

const observation = process.argv[2] || 'default programming language is rust';
const entityName = process.argv[3] || 'User Preferences';

// MCP server endpoint (assuming local MCP memory server via stdio or HTTP)
// For HTTP-based MCP, we'd use the chat server's MCP endpoint
const MCP_ENDPOINT = process.env.MCP_ENDPOINT || 'http://localhost:8080/api/mcp';

async function createObservation() {
    try {
        // First, try to search for existing entity
        console.log(`🔍 Searching for entity: ${entityName}...`);
        
        const searchRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: 'search_nodes',
                arguments: {
                    query: entityName
                }
            }
        };

        const searchResult = await mcpRequest(searchRequest);
        
        // Check if entity exists
        let entityExists = false;
        if (searchResult && searchResult.nodes && searchResult.nodes.length > 0) {
            const found = searchResult.nodes.find(n => 
                n.name && n.name.toLowerCase() === entityName.toLowerCase()
            );
            if (found) {
                entityExists = true;
                console.log(`✅ Found existing entity: ${entityName}`);
            }
        }

        if (entityExists) {
            // Add observation to existing entity
            console.log(`➕ Adding observation to existing entity...`);
            const addRequest = {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/call',
                params: {
                    name: 'add_observations',
                    arguments: {
                        observations: [{
                            entityName: entityName,
                            contents: [observation]
                        }]
                    }
                }
            };

            const result = await mcpRequest(addRequest);
            console.log(`✅ Observation added successfully!`);
            console.log(`   Entity: ${entityName}`);
            console.log(`   Observation: "${observation}"`);
            return result;
        } else {
            // Create new entity with observation
            console.log(`🆕 Creating new entity with observation...`);
            const createRequest = {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/call',
                params: {
                    name: 'create_entities',
                    arguments: {
                        entities: [{
                            name: entityName,
                            entityType: 'concept',
                            observations: [observation]
                        }]
                    }
                }
            };

            const result = await mcpRequest(createRequest);
            console.log(`✅ Entity created with observation!`);
            console.log(`   Entity: ${entityName}`);
            console.log(`   Type: concept`);
            console.log(`   Observation: "${observation}"`);
            return result;
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

function mcpRequest(payload) {
    return new Promise((resolve, reject) => {
        const url = new URL(MCP_ENDPOINT);
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.error) {
                        reject(new Error(response.error.message || 'MCP request failed'));
                    } else {
                        resolve(response.result || response);
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${e.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(JSON.stringify(payload));
        req.end();
    });
}

// Run if called directly
if (require.main === module) {
    createObservation();
}

module.exports = { createObservation };

