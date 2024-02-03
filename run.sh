#!/bin/sh

if [ -z "$node" ]; then
	if command -v bun &> /dev/null; then
		echo "Using bun"
		node="bun run --bun --experimental-modules"
	else
		echo "Using node"
		node="node --experimental-modules"
	fi
else
	echo Using $node
fi

while true
do
	$node ./index.js
	echo "Restarting bot"
done
