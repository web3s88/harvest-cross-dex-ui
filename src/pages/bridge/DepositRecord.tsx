import React, { useMemo } from 'react'
import { Signature, splitSignature } from '@ethersproject/bytes'
import { useActiveWeb3React, useTokenBridgeContract } from '../../hooks'
import { MINTYS_ADDRESS } from '../../constants'
import Button from '../../components/Button'
import { formatEther, formatUnits } from '@ethersproject/units'
import { useCurrency } from '../../hooks/Tokens'
import CurrencyLogo from '../../components/CurrencyLogo'
import Image from '../../components/Image'
import { NETWORK_ICON, NETWORK_LABEL } from '../../config/networks'
import { SUPPORTED_NETWORKS } from '../../modals/NetworkModal'
import { ChainId } from '@sushiswap/sdk'

export default function DepositRecord({
  amount,
  fromChain,
  toChain,
  token,
  sig,
  payed,
  txhash,
}: {
  amount: string
  fromChain: number
  toChain: number
  token: string
  sig: Signature
  payed: boolean
  txhash: string
}) {
  const { chainId, library, account } = useActiveWeb3React()

  const changeNetworkTo = (key) => {
    const params = SUPPORTED_NETWORKS[key]
    if (key === ChainId.MAINNET) {
      library?.send('wallet_switchEthereumChain', [{ chainId: '0x1' }, account])
    } else {
      library?.send('wallet_addEthereumChain', [params, account])
    }
  }

  const TokenBridge = useTokenBridgeContract()
  const claim = () => {
    if(toChain !== chainId) {
      changeNetworkTo(toChain)
      return
    }
    if (sig) {
      const signature = splitSignature(sig)
      TokenBridge.withdraw(MINTYS_ADDRESS[chainId], amount, fromChain, txhash, signature)
    } else {
      console.log('Pending')
    }
  }

  const currency = useCurrency(token, fromChain)

  const formatedAmount = useMemo(() => {
    if(currency && amount) {
      return formatUnits(amount, currency.decimals)
    }
    return 0
  }, [currency, amount])

  return (
    <tr>
      <td>
        <div className="flex items-center">
          <img src={NETWORK_ICON[fromChain]} alt="Network" className="rounded-md" width="32px" height="32px" />
          &nbsp;
          {NETWORK_LABEL[fromChain]}
        </div>
      </td>
      <td>
        <CurrencyLogo currency={currency} />
      </td>
      <td>
        <div className="flex items-center">
          <img src={NETWORK_ICON[toChain]} alt="Network" className="rounded-md" width="32px" height="32px" />
          &nbsp;
          {NETWORK_LABEL[toChain]}
        </div>
      </td>
      <td>{formatedAmount}</td>
      <td>
        {payed ? (
          'done'
        ) : (
          <Button className="btn-primary" onClick={claim}>
            Claim
          </Button>
        )}
      </td>
    </tr>
  )
}
