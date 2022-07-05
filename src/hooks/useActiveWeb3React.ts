import { ChainId } from '@sushiswap/sdk'
import { NetworkContextName } from '../constants'
import { Web3Provider } from '@ethersproject/providers'
import { Web3ReactContextInterface } from '@web3-react/core/dist/types'
import { useWeb3React as useWeb3ReactCore } from '@web3-react/core'
import { getNetwork } from '../connectors'
import { getNetworkLibrary2 } from '../functions/getNetworkLibrary'

export function useActiveWeb3React(chainId?:number): Web3ReactContextInterface<Web3Provider> & {
  chainId?: ChainId
} {
  // replace with address to impersonate
  const impersonate = false
  const context = useWeb3ReactCore<Web3Provider>()
  const contextNetwork = useWeb3ReactCore<Web3Provider>(NetworkContextName)
  if(chainId && context.chainId !== chainId) {
    return {...context, chainId, library: getNetworkLibrary2(chainId)}
  }
  return context.active
    ? { ...context, account: impersonate || context.account }
    : { ...contextNetwork, account: impersonate || contextNetwork.account }
}

export default useActiveWeb3React
