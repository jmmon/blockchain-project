# Javscript Blockchain Project

Node + blockchain, miner (and multi-threaded miner), wallet, block explorer, and faucet applications, built with Javascript.

## How to use:
### Nodes:

Start nodes with:
- `cd node` and `npm start` (default port 5555) or `npm start --- -p 5556` to change the node port

Connect multiple nodes together with:
- use Postman to interact with node API at `/peers/connect` POST endpoint
Example body:
`{
    "nodeIdentifier": "{thisNodesIdentifier}",
    "peerUrl": "{otherNodesUrl}"
}`

### Mining:

Start mining on a node in the network:
- `cd miner-threads` and `npm start` (default target node is 5555) or
- `npm start --- -p 5556` or `-port 5556` to change the target node
- `-c 4` or `-cores 4` to change thread count (service worker count) to be used by miner
- `-w 0` or `-wallet 0` or `-i 0` or `-index 0` (takes 0 - 4) to select a pre-configured account for the miner to receive rewards

e.g. `npm start --- p 5557 -c 4 -w 4` to mine on node 5557 with 2 cores and receive rewards to wallet[4].

Nodes that are connected as peers should propagate mined blocks to other peers.

### Block Explorer:

- `cd block-explorer-qwik` and `npm start` to start the block explorer (port 5173)

The block explorer connects by default to the node running on port 5555.

You'll notice when navigating the block explorer, the URL includes `5555` in the path. This is the node the explorer is currently connected to.

If the currently connected node has peers, you can point the block explorer to one of those peers (instead of the default) by:
- going to Peers
- click one of the other peers listed

This will change the URL used for the block explorer so that it points to the other port, i.e.
`http://127.0.0.1:5174/5557/addresses`

Browse blocks, transactions, addresses, balances, peers, and other information through the block explorer.

### Wallet:

- `cd express-wallet-base` and `npm start` to start the express-based wallet app (port 3003).

You can create a new wallet/mnemonic, recover from a mnemonic, send transactions, check balance, etc. Creating or recovering a wallet requires choosing a password, so that the password is required to complete certain actions in the wallet.

When sending a transaction or checking balances, you will be able to input the URL of the node you'd like to send the request to.

Once a node receives a transaction, it will propagate that transaction to all of its peers.

### Faucet:

- `cd faucet` and `npm start` to start the express-based faucet app (port 3007).

The faucet uses a hard-coded account which is automatically supplied funds from the genesis block when a node is started. You may input an address (and a node URL) to request funds from the faucet, or you may donate funds back to the faucet's address.

Addresses may request funds from the faucet only every so often, so if you try too often it will ask you to wait.