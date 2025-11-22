#!/bin/bash
# OVS Privacy Network Setup Script
# Sets up single-bridge topology with privacy obfuscation and service routing

set -e

echo "========================================="
echo "  OVS Privacy Network Setup"
echo "========================================="

# Configuration
BRIDGE="ovsbr0"
UPLINK_IF="${UPLINK_IF:-eth0}"
INTERNAL_IP="172.16.0.1/16"
CONTROLLER_PORT="6653"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root or with sudo"
fi

# Check OVS installation
if ! command -v ovs-vsctl &> /dev/null; then
    error "Open vSwitch not installed. Install with: apt install openvswitch-switch"
fi

info "Step 1: Creating OVS bridge '$BRIDGE'"
ovs-vsctl --may-exist add-br $BRIDGE
ovs-vsctl set bridge $BRIDGE protocols=OpenFlow13,OpenFlow14,OpenFlow15
ovs-vsctl set bridge $BRIDGE fail_mode=secure
info "Bridge created successfully"

info "Step 2: Setting up internal port"
ovs-vsctl --may-exist add-port $BRIDGE ${BRIDGE}-internal -- \
    set interface ${BRIDGE}-internal type=internal

# Configure internal port IP
ip addr add $INTERNAL_IP dev ${BRIDGE}-internal 2>/dev/null || \
    warn "Internal IP already configured"
ip link set ${BRIDGE}-internal up
info "Internal port configured: $INTERNAL_IP"

info "Step 3: Adding uplink port"
if ip link show $UPLINK_IF &> /dev/null; then
    ovs-vsctl --may-exist add-port $BRIDGE $UPLINK_IF
    ip addr flush dev $UPLINK_IF 2>/dev/null || true
    ip link set $UPLINK_IF up
    info "Uplink port added: $UPLINK_IF"
else
    warn "Uplink interface $UPLINK_IF not found, skipping"
fi

info "Step 4: Creating privacy socket network"
ip netns add privacy-ns 2>/dev/null || warn "Privacy namespace already exists"
ip link add privacy-veth0 type veth peer name privacy-veth1 2>/dev/null || \
    warn "Privacy veth pair already exists"

ip link set privacy-veth1 netns privacy-ns 2>/dev/null || true
ip link set privacy-veth0 up
ip netns exec privacy-ns ip link set privacy-veth1 up
ip netns exec privacy-ns ip addr add 172.17.0.1/24 dev privacy-veth1 2>/dev/null || true

ovs-vsctl --may-exist add-port $BRIDGE privacy-veth0
info "Privacy socket network created"

info "Step 5: Creating container socket network"
ip netns add container-ns 2>/dev/null || warn "Container namespace already exists"
ip link add container-veth0 type veth peer name container-veth1 2>/dev/null || \
    warn "Container veth pair already exists"

ip link set container-veth1 netns container-ns 2>/dev/null || true
ip link set container-veth0 up
ip netns exec container-ns ip link set container-veth1 up
ip netns exec container-ns ip addr add 172.18.0.1/24 dev container-veth1 2>/dev/null || true

ovs-vsctl --may-exist add-port $BRIDGE container-veth0
info "Container socket network created"

info "Step 6: Setting up NAT for containers"
# Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1 > /dev/null

# Set up NAT
iptables -t nat -A POSTROUTING -s 172.16.0.0/16 ! -d 172.16.0.0/16 -j MASQUERADE 2>/dev/null || \
    warn "NAT rule already exists"
info "NAT configured for container network"

info "Step 7: Configuring OpenFlow controller"
# Note: Controller must be running on localhost:6653
# ovs-vsctl set-controller $BRIDGE tcp:127.0.0.1:$CONTROLLER_PORT
info "OpenFlow controller can be set with: ovs-vsctl set-controller $BRIDGE tcp:127.0.0.1:$CONTROLLER_PORT"

info "Step 8: Installing basic OpenFlow rules"
# Clear existing flows
ovs-ofctl del-flows $BRIDGE

# Get port numbers
INTERNAL_PORT=$(ovs-ofctl show $BRIDGE | grep "${BRIDGE}-internal" | awk '{print $1}' | tr -d ':')
PRIVACY_PORT=$(ovs-ofctl show $BRIDGE | grep "privacy-veth0" | awk '{print $1}' | tr -d ':')
CONTAINER_PORT=$(ovs-ofctl show $BRIDGE | grep "container-veth0" | awk '{print $1}' | tr -d ':')
UPLINK_PORT=$(ovs-ofctl show $BRIDGE | grep "$UPLINK_IF" | awk '{print $1}' | tr -d ':')

# Table 0: Service Classification
ovs-ofctl add-flow $BRIDGE "table=0,priority=5000,arp,actions=NORMAL"
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
if [ -n "$PRIVACY_PORT" ]; then
    ovs-ofctl add-flow $BRIDGE "table=40,priority=3000,reg1=1,actions=output:$PRIVACY_PORT"
fi
if [ -n "$CONTAINER_PORT" ]; then
    ovs-ofctl add-flow $BRIDGE "table=40,priority=2000,nw_dst=172.16.0.0/16,actions=output:$CONTAINER_PORT"
fi
if [ -n "$UPLINK_PORT" ]; then
    ovs-ofctl add-flow $BRIDGE "table=40,priority=1000,actions=output:$UPLINK_PORT"
fi

info "OpenFlow rules installed"

echo ""
echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo ""
echo "Bridge Status:"
ovs-vsctl show
echo ""
echo "OpenFlow Rules:"
ovs-ofctl dump-flows $BRIDGE | head -20
echo ""
info "Next steps:"
info "1. Start OpenFlow controller: ryu-manager /path/to/privacy-controller.py"
info "2. Configure Netmaker: Add nm0 interface to bridge"
info "3. Deploy containers with network: ovs-privacy-net"
echo ""
