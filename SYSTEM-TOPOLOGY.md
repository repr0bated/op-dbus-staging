# System Network Topology - Privacy-Focused OVS Container Network

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Physical Network / Uplink                        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   ovsbr0 (Main Bridge)   │
                    │  OpenFlow 1.3+ Enabled   │
                    └──┬────────┬──────┬───────┘
                       │        │      │
         ┌─────────────┼────────┼──────┼──────────────┐
         │             │        │      │              │
    ┌────▼───┐   ┌────▼───┐ ┌──▼───┐ │         ┌────▼────┐
    │Internal│   │Privacy │ │ Net  │ │         │ Uplink  │
    │  Port  │   │ Socket │ │Maker │ │         │  Port   │
    │(Bridge)│   │  Net   │ │ VPN  │ │         │   eth0  │
    └────┬───┘   └────┬───┘ └──┬───┘ │         └─────────┘
         │            │        │     │
    ┌────▼────────────▼────────▼─────▼───────────────────┐
    │         Container Socket Network Layer              │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
    │  │Container1│  │Container2│  │Container3│         │
    │  │ (Service │  │ (Service │  │ (Service │         │
    │  │   A)     │  │   B)     │  │   C)     │         │
    │  └──────────┘  └──────────┘  └──────────┘         │
    │         OpenFlow Rules for Service Routing         │
    │         + Traffic Obfuscation Layer                │
    └────────────────────────────────────────────────────┘
```

## Component Details

### 1. ovsbr0 - Main OVS Bridge

**Purpose**: Single unified bridge for all network traffic
**Type**: Open vSwitch Bridge
**OpenFlow Version**: 1.3+

**Ports**:
- `internal_port`: Bridge internal interface (for local addressing)
- `uplink_port`: Physical uplink (eth0 or similar)
- `privacy_veth`: Privacy socket network endpoint
- `container_veth`: Container socket network endpoint
- `netmaker_tun`: Netmaker VPN tunnel interface

**Configuration**:
```bash
ovs-vsctl add-br ovsbr0
ovs-vsctl set bridge ovsbr0 protocols=OpenFlow13,OpenFlow14,OpenFlow15
ovs-vsctl set-controller ovsbr0 tcp:127.0.0.1:6653
```

### 2. Privacy Socket Network

**Purpose**: Obfuscated network path for privacy-sensitive traffic
**Implementation**: Unix domain sockets + veth pairs
**Obfuscation**: OpenFlow-based traffic morphing

**Features**:
- Socket-based isolation from main network stack
- Per-packet obfuscation via OpenFlow rules
- No direct exposure to physical interfaces
- Traffic shaping to avoid fingerprinting

**Flow Rules**:
```
Priority: 1000
Match: in_port=privacy_socket
Actions:
  - mod_dl_src (randomize MAC)
  - mod_nw_tos (randomize TOS)
  - output:uplink_port
```

### 3. Container Socket Network

**Purpose**: Isolated network namespace for container communication
**Implementation**: Docker/Podman network plugin using OVS
**Routing**: Service-based OpenFlow routing

**Network Configuration**:
```
Network: 172.16.0.0/16
Gateway: 172.16.0.1 (internal_port)
DNS: Via Netmaker or local resolver
MTU: 1500 (adjustable for VPN overhead)
```

**Per-Container Isolation**:
- Separate network namespace per container
- veth pair connecting to ovsbr0
- OpenFlow rules for inter-service communication
- Egress traffic routed through privacy layer

### 4. Netmaker Integration

**Purpose**: Encrypted mesh VPN overlay network
**Integration Point**: Dedicated port on ovsbr0
**IP Range**: 10.10.0.0/16 (Netmaker network)

**Configuration**:
```json
{
  "network_name": "privacy-mesh",
  "address_range": "10.10.0.0/16",
  "interface": "nm0",
  "is_local": false,
  "default_udp_hole_punch": "yes"
}
```

**OVS Integration**:
```bash
# Add Netmaker interface to bridge
ovs-vsctl add-port ovsbr0 nm0

# Set up flows for Netmaker traffic
ovs-ofctl add-flow ovsbr0 "priority=2000,in_port=nm0,actions=NORMAL"
```

### 5. Internal Port (Bridge Interface)

**Purpose**: Local addressing and gateway for containers
**IP Address**: 172.16.0.1/16
**Functions**:
  - Default gateway for containers
  - NAT endpoint for outbound traffic
  - DNS resolver endpoint
  - Health check endpoint

**Configuration**:
```bash
ovs-vsctl add-port ovsbr0 ovsbr0-internal -- set interface ovsbr0-internal type=internal
ip addr add 172.16.0.1/16 dev ovsbr0-internal
ip link set ovsbr0-internal up
```

### 6. Uplink Port

**Purpose**: Physical connection to external network
**Interface**: eth0 (or primary network interface)
**Configuration**: Bridged to ovsbr0 without IP address

```bash
ovs-vsctl add-port ovsbr0 eth0
ip addr flush dev eth0
```

## OpenFlow Routing Architecture

### Service-Based Routing

**Concept**: Route traffic based on service identity, not IP address

**Service Table (Table 0 - Classification)**:
```
# Classify incoming traffic by service
priority=3000,tcp,tp_dst=80,actions=set_field:1->reg0,resubmit(,10)
priority=3000,tcp,tp_dst=443,actions=set_field:2->reg0,resubmit(,10)
priority=3000,tcp,tp_dst=8080,actions=set_field:3->reg0,resubmit(,10)
priority=1000,actions=set_field:0->reg0,resubmit(,10)
```

**Routing Table (Table 10 - Service Routing)**:
```
# Service A (HTTP) -> Container 1
priority=3000,reg0=1,actions=set_field:172.16.0.10->ip_dst,resubmit(,20)

# Service B (HTTPS) -> Container 2
priority=3000,reg0=2,actions=set_field:172.16.0.20->ip_dst,resubmit(,20)

# Service C (Custom) -> Container 3
priority=3000,reg0=3,actions=set_field:172.16.0.30->ip_dst,resubmit(,20)

# Default: privacy routing
priority=1000,actions=resubmit(,30)
```

**Obfuscation Table (Table 20 - Traffic Morphing)**:
```
# Randomize packet characteristics for privacy
priority=3000,ip,actions=\
  mod_nw_tos:0x00,\
  set_field:$RANDOM_MAC->eth_src,\
  set_field:$RANDOM_TTL->nw_ttl,\
  resubmit(,40)
```

**Privacy Table (Table 30 - Privacy Routing)**:
```
# Route through privacy socket network
priority=3000,ip,actions=\
  set_field:privacy_socket->reg1,\
  mod_dl_src:$OBFUSCATED_MAC,\
  mod_dl_dst:$PRIVACY_GW_MAC,\
  resubmit(,40)
```

**Output Table (Table 40 - Final Output)**:
```
# Output to appropriate port
priority=3000,reg1=1,actions=output:privacy_socket
priority=3000,reg1=2,actions=output:container_veth
priority=3000,reg1=3,actions=output:netmaker_tun
priority=1000,actions=output:uplink_port
```

## Privacy Obfuscation Techniques

### 1. MAC Address Randomization
```python
# Randomize source MAC every N packets
flow_mod = {
    "priority": 2000,
    "match": {"in_port": "privacy_socket"},
    "actions": [
        {"type": "SET_FIELD", "field": "eth_src", "value": generate_random_mac()},
        {"type": "OUTPUT", "port": "uplink_port"}
    ]
}
```

### 2. TTL Randomization
```python
# Randomize TTL to avoid OS fingerprinting
ttl_values = [64, 128, 255]  # Common TTL values
random_ttl = random.choice(ttl_values) + random.randint(-2, 2)
```

### 3. Packet Timing Obfuscation
```python
# Add random delays between packets
delay_ms = random.randint(0, 50)  # 0-50ms random delay
```

### 4. Traffic Shaping
```python
# Shape traffic to avoid pattern detection
tc qdisc add dev ovsbr0 root netem \
  delay 10ms 5ms distribution normal \
  loss random 0.1%
```

### 5. Protocol Obfuscation
```
# Wrap traffic in innocuous-looking protocols
priority=2500,tcp,actions=\
  encap(nsh),\
  set_field:443->tcp_dst,\
  decap(nsh),\
  output:uplink_port
```

## Container Network Configuration

### Docker/Podman Integration

**OVS Network Plugin**:
```json
{
  "name": "ovs-privacy-net",
  "type": "ovs",
  "bridge": "ovsbr0",
  "ipam": {
    "type": "host-local",
    "subnet": "172.16.0.0/16",
    "gateway": "172.16.0.1"
  }
}
```

**Per-Container Configuration**:
```yaml
services:
  service_a:
    image: nginx:latest
    networks:
      ovs-privacy-net:
        ipv4_address: 172.16.0.10
    labels:
      ovs.service_id: "1"
      ovs.routing: "privacy"

  service_b:
    image: postgres:latest
    networks:
      ovs-privacy-net:
        ipv4_address: 172.16.0.20
    labels:
      ovs.service_id: "2"
      ovs.routing: "direct"

  service_c:
    image: redis:latest
    networks:
      ovs-privacy-net:
        ipv4_address: 172.16.0.30
    labels:
      ovs.service_id: "3"
      ovs.routing: "netmaker"
```

### Service Routing Matrix

| Service | Container | IP Address  | Route Type | Obfuscation |
|---------|-----------|-------------|------------|-------------|
| HTTP    | service_a | 172.16.0.10 | Privacy    | Full        |
| HTTPS   | service_b | 172.16.0.20 | Privacy    | Full        |
| Custom  | service_c | 172.16.0.30 | Netmaker   | Partial     |
| Mgmt    | internal  | 172.16.0.1  | Direct     | None        |

## Implementation Scripts

### 1. Initial Setup Script

```bash
#!/bin/bash
# setup-ovs-privacy-network.sh

set -e

echo "=== Setting up OVS Privacy Network ==="

# Create main bridge
ovs-vsctl --may-exist add-br ovsbr0
ovs-vsctl set bridge ovsbr0 protocols=OpenFlow13,OpenFlow14,OpenFlow15

# Add internal port
ovs-vsctl --may-exist add-port ovsbr0 ovsbr0-internal -- \
  set interface ovsbr0-internal type=internal
ip addr add 172.16.0.1/16 dev ovsbr0-internal || true
ip link set ovsbr0-internal up

# Add uplink port (adjust interface name as needed)
UPLINK_IF="eth0"
ovs-vsctl --may-exist add-port ovsbr0 $UPLINK_IF
ip addr flush dev $UPLINK_IF || true

# Create privacy socket network
ip netns add privacy-ns || true
ip link add privacy-veth0 type veth peer name privacy-veth1
ip link set privacy-veth1 netns privacy-ns
ip link set privacy-veth0 up
ip netns exec privacy-ns ip link set privacy-veth1 up
ovs-vsctl --may-exist add-port ovsbr0 privacy-veth0

# Create container socket network
ip netns add container-ns || true
ip link add container-veth0 type veth peer name container-veth1
ip link set container-veth1 netns container-ns
ip link set container-veth0 up
ip netns exec container-ns ip link set container-veth1 up
ovs-vsctl --may-exist add-port ovsbr0 container-veth0

echo "=== OVS Bridge Setup Complete ==="
ovs-vsctl show
```

### 2. OpenFlow Rules Setup

```bash
#!/bin/bash
# setup-openflow-rules.sh

set -e

BRIDGE="ovsbr0"

echo "=== Configuring OpenFlow Rules ==="

# Clear existing flows
ovs-ofctl del-flows $BRIDGE

# Table 0: Service Classification
ovs-ofctl add-flow $BRIDGE "table=0,priority=3000,tcp,tp_dst=80,actions=load:1->NXM_NX_REG0[],resubmit(,10)"
ovs-ofctl add-flow $BRIDGE "table=0,priority=3000,tcp,tp_dst=443,actions=load:2->NXM_NX_REG0[],resubmit(,10)"
ovs-ofctl add-flow $BRIDGE "table=0,priority=3000,tcp,tp_dst=8080,actions=load:3->NXM_NX_REG0[],resubmit(,10)"
ovs-ofctl add-flow $BRIDGE "table=0,priority=1000,actions=load:0->NXM_NX_REG0[],resubmit(,10)"

# Table 10: Service Routing
ovs-ofctl add-flow $BRIDGE "table=10,priority=3000,reg0=1,actions=mod_nw_dst:172.16.0.10,resubmit(,20)"
ovs-ofctl add-flow $BRIDGE "table=10,priority=3000,reg0=2,actions=mod_nw_dst:172.16.0.20,resubmit(,20)"
ovs-ofctl add-flow $BRIDGE "table=10,priority=3000,reg0=3,actions=mod_nw_dst:172.16.0.30,resubmit(,20)"
ovs-ofctl add-flow $BRIDGE "table=10,priority=1000,actions=resubmit(,30)"

# Table 20: Container Delivery
ovs-ofctl add-flow $BRIDGE "table=20,priority=3000,nw_dst=172.16.0.0/16,actions=resubmit(,40)"

# Table 30: Privacy Routing
ovs-ofctl add-flow $BRIDGE "table=30,priority=3000,actions=load:1->NXM_NX_REG1[],resubmit(,40)"

# Table 40: Output
PRIVACY_PORT=$(ovs-ofctl show $BRIDGE | grep privacy-veth0 | awk '{print $1}' | tr -d ':')
CONTAINER_PORT=$(ovs-ofctl show $BRIDGE | grep container-veth0 | awk '{print $1}' | tr -d ':')
UPLINK_PORT=$(ovs-ofctl show $BRIDGE | grep eth0 | awk '{print $1}' | tr -d ':')

ovs-ofctl add-flow $BRIDGE "table=40,priority=3000,reg1=1,actions=output:$PRIVACY_PORT"
ovs-ofctl add-flow $BRIDGE "table=40,priority=2000,nw_dst=172.16.0.0/16,actions=output:$CONTAINER_PORT"
ovs-ofctl add-flow $BRIDGE "table=40,priority=1000,actions=output:$UPLINK_PORT"

echo "=== OpenFlow Rules Configured ==="
ovs-ofctl dump-flows $BRIDGE
```

### 3. Privacy Obfuscation Daemon

```python
#!/usr/bin/env python3
# privacy-obfuscation-daemon.py

import random
import time
from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import CONFIG_DISPATCHER, MAIN_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.ofproto import ofproto_v1_3
from ryu.lib.packet import packet, ethernet, ipv4

class PrivacyObfuscationController(app_manager.RyuApp):
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]

    def __init__(self, *args, **kwargs):
        super(PrivacyObfuscationController, self).__init__(*args, **kwargs)
        self.mac_cache = {}
        self.packet_counter = 0

    def generate_random_mac(self):
        """Generate random MAC address"""
        mac = [0x00, 0x16, 0x3e,
               random.randint(0x00, 0x7f),
               random.randint(0x00, 0xff),
               random.randint(0x00, 0xff)]
        return ':'.join(map(lambda x: "%02x" % x, mac))

    def obfuscate_packet(self, pkt):
        """Apply obfuscation techniques to packet"""
        eth_pkt = pkt.get_protocol(ethernet.ethernet)
        ipv4_pkt = pkt.get_protocol(ipv4.ipv4)

        # Randomize MAC every 100 packets
        if self.packet_counter % 100 == 0:
            eth_pkt.src = self.generate_random_mac()

        # Randomize TTL
        if ipv4_pkt:
            base_ttl = random.choice([64, 128, 255])
            ipv4_pkt.ttl = base_ttl + random.randint(-2, 2)

        self.packet_counter += 1
        return pkt

    @set_ev_cls(ofp_event.EventOFPPacketIn, MAIN_DISPATCHER)
    def packet_in_handler(self, ev):
        """Handle incoming packets for obfuscation"""
        msg = ev.msg
        datapath = msg.datapath
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        pkt = packet.Packet(msg.data)

        # Obfuscate packet
        obfuscated_pkt = self.obfuscate_packet(pkt)

        # Send obfuscated packet
        actions = [parser.OFPActionOutput(ofproto.OFPP_FLOOD)]
        out = parser.OFPPacketOut(
            datapath=datapath,
            buffer_id=ofproto.OFP_NO_BUFFER,
            in_port=msg.match['in_port'],
            actions=actions,
            data=obfuscated_pkt.data
        )
        datapath.send_msg(out)
```

## Security Considerations

### 1. Isolation
- Network namespaces for privacy and container networks
- OpenFlow rules prevent cross-contamination
- No direct routing between privacy and container networks

### 2. Obfuscation Layers
- MAC address randomization
- TTL manipulation
- Packet timing randomization
- Traffic shaping
- Protocol obfuscation

### 3. Access Control
- OpenFlow-based ACLs
- Service-specific routing rules
- Netmaker encryption for mesh traffic

### 4. Monitoring
- Flow statistics without packet inspection
- Aggregate traffic metrics only
- No logging of packet contents

## Performance Tuning

### OpenFlow Optimization
```bash
# Increase flow table size
ovs-vsctl set Bridge ovsbr0 flow_limit=1000000

# Enable fast-path
ovs-vsctl set Open_vSwitch . other_config:max-idle=60000

# Optimize datapath
ovs-vsctl set Bridge ovsbr0 datapath_type=netdev
```

### Container Network Optimization
```bash
# Increase MTU for container interfaces
ip link set ovsbr0-internal mtu 9000

# Enable TSO/GSO offload
ethtool -K ovsbr0-internal tso on gso on
```

## Maintenance & Troubleshooting

### Check Bridge Status
```bash
ovs-vsctl show
ovs-ofctl dump-flows ovsbr0
ovs-ofctl dump-ports ovsbr0
```

### Monitor Traffic
```bash
# Watch flow statistics
watch -n 1 'ovs-ofctl dump-flows ovsbr0 | grep -E "priority|n_packets"'

# Check port statistics
ovs-ofctl dump-ports-desc ovsbr0
```

### Debug Privacy Routing
```bash
# Trace packet path
ovs-appctl ofproto/trace ovsbr0 in_port=privacy-veth0,tcp,tp_dst=443

# Check obfuscation effectiveness
tcpdump -i ovsbr0 -c 100 -w /tmp/traffic.pcap
```

## Summary

This topology provides:
- ✅ Single OVS bridge (ovsbr0) for all traffic
- ✅ Privacy socket network with obfuscation
- ✅ Container socket network with isolation
- ✅ Netmaker VPN integration
- ✅ Service-based OpenFlow routing
- ✅ Multi-layer traffic obfuscation
- ✅ Internal addressing and gateway
- ✅ Secure uplink configuration

All components work together to provide privacy-focused, service-oriented container networking with comprehensive traffic obfuscation.
