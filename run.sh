#!/bin/sh

if [ -z "$node" ]; then
	echo "Using node"
	node="node --experimental-modules"
else
	echo Using $node
fi

while true
do
	$node ./index.js
	echo "Restarting bot"
done
