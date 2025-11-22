# OVS Privacy Network - Quick Start Guide

## Setup (Copy & Paste These Commands)

### 1. Run Setup Script
```bash
cd /home/user/op-dbus-staging
sudo ./scripts/setup-ovs-privacy-network.sh
```

### 2. Start OpenFlow Controller
```bash
# In a separate terminal:
sudo python3 ./scripts/privacy-obfuscation-controller.py
```

### 3. Deploy Containers
```bash
docker-compose -f docker-compose-ovs-privacy.yml up -d
```

## Verify Setup

```bash
# Check bridge
sudo ovs-vsctl show

# Check flows
sudo ovs-ofctl dump-flows ovsbr0

# Check containers
docker ps

# Test connectivity
docker exec privacy-service-http wget -qO- http://localhost
```

## Service IPs

- HTTP Service: 172.16.0.10
- HTTPS Service: 172.16.0.20
- Custom Service: 172.16.0.30
- Management: 172.16.0.100
- Gateway: 172.16.0.1

## Manual OVS Setup (If Script Fails)

```bash
# Create bridge
sudo ovs-vsctl add-br ovsbr0
sudo ovs-vsctl set bridge ovsbr0 protocols=OpenFlow13

# Add internal port
sudo ovs-vsctl add-port ovsbr0 ovsbr0-internal -- set interface ovsbr0-internal type=internal
sudo ip addr add 172.16.0.1/16 dev ovsbr0-internal
sudo ip link set ovsbr0-internal up

# Add uplink (change eth0 to your interface)
sudo ovs-vsctl add-port ovsbr0 eth0
sudo ip addr flush dev eth0

# Enable NAT
sudo sysctl -w net.ipv4.ip_forward=1
sudo iptables -t nat -A POSTROUTING -s 172.16.0.0/16 ! -d 172.16.0.0/16 -j MASQUERADE
```

## OpenFlow Rules (Copy All)

```bash
BRIDGE=ovsbr0

# Clear flows
sudo ovs-ofctl del-flows $BRIDGE

# Table 0: Classify traffic
sudo ovs-ofctl add-flow $BRIDGE "table=0,priority=3000,tcp,tp_dst=80,actions=load:1->NXM_NX_REG0[],resubmit(,10)"
sudo ovs-ofctl add-flow $BRIDGE "table=0,priority=3000,tcp,tp_dst=443,actions=load:2->NXM_NX_REG0[],resubmit(,10)"
sudo ovs-ofctl add-flow $BRIDGE "table=0,priority=3000,tcp,tp_dst=8080,actions=load:3->NXM_NX_REG0[],resubmit(,10)"
sudo ovs-ofctl add-flow $BRIDGE "table=0,priority=1000,actions=load:0->NXM_NX_REG0[],resubmit(,10)"

# Table 10: Route to services
sudo ovs-ofctl add-flow $BRIDGE "table=10,priority=3000,reg0=1,actions=mod_nw_dst:172.16.0.10,resubmit(,20)"
sudo ovs-ofctl add-flow $BRIDGE "table=10,priority=3000,reg0=2,actions=mod_nw_dst:172.16.0.20,resubmit(,20)"
sudo ovs-ofctl add-flow $BRIDGE "table=10,priority=3000,reg0=3,actions=mod_nw_dst:172.16.0.30,resubmit(,20)"

# Table 40: Output
sudo ovs-ofctl add-flow $BRIDGE "table=40,priority=1000,actions=NORMAL"
```

## Troubleshooting

```bash
# Check logs
docker-compose -f docker-compose-ovs-privacy.yml logs -f

# Check OVS
sudo ovs-vsctl show
sudo ovs-ofctl dump-flows ovsbr0
sudo ovs-ofctl dump-ports ovsbr0

# Test container network
docker exec privacy-service-http ping -c 3 172.16.0.1
docker exec privacy-service-http ping -c 3 8.8.8.8

# Restart OVS
sudo systemctl restart openvswitch-switch
```

## Files Reference

- Full topology: `SYSTEM-TOPOLOGY.md`
- Setup script: `scripts/setup-ovs-privacy-network.sh`
- Controller: `scripts/privacy-obfuscation-controller.py`
- Docker compose: `docker-compose-ovs-privacy.yml`
