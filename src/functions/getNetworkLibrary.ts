import { NetworkConnector } from '../entities/NetworkConnector'
import { Web3Provider } from '@ethersproject/providers'
import { network, networks } from '../config/wallets'
import { ChainId } from '@sushiswap/sdk'

let networkLibrary: Web3Provider | undefined

export function getNetworkLibrary(): Web3Provider {
  return (networkLibrary = networkLibrary ?? new Web3Provider(network.provider as any))
}

let networkLibrarys = {
  [ChainId.BSC]: new Web3Provider(networks[ChainId.BSC].provider as any),
  [ChainId.MAINNET]: new Web3Provider(networks[ChainId.MAINNET].provider as any),
  [ChainId.MATIC]: new Web3Provider(networks[ChainId.MATIC].provider as any),
}

export function getNetworkLibrary2(chainId: number): Web3Provider {
  return networkLibrarys[chainId]
}
