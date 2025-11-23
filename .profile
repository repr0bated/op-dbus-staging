export NETMAKER_TOKEN=eyJzZXJ2ZXIiOiJhcGkuZ2hvc3RicmlkZ2UudGVjaCIsInZhbHVlIjoiQjJHTVlQQkw1SlVHSTJTNTQ2QVhZRlQyNzJWVjNITkQifQ==

# Go 1.25.4 Configuration
if [ -f "$HOME/op-dbus-staging/setup-go.sh" ]; then
    source "$HOME/op-dbus-staging/setup-go.sh"
elif [ -f "/home/user/op-dbus-staging/setup-go.sh" ]; then
    source "/home/user/op-dbus-staging/setup-go.sh"
fi
