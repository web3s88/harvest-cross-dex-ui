import { useActiveWeb3React } from './useActiveWeb3React'
import { useCrossBridgeContract } from './useContract'
import { BigNumberish } from '@ethersproject/bignumber'
import { Currency, CurrencyAmount, toHex } from '@sushiswap/sdk'
import { useMemo } from 'react'
import { TransactionResponse } from '@ethersproject/providers'
import { calculateGasMargin } from '../functions'
import { useAddPopup } from '../state/application/hooks'

export function useCrossSwapCallback({
  callPath,
  destTokenAddr,
  amount,
  toChainId,
}: {
  callPath: string[] | undefined
  destTokenAddr: string
  amount: CurrencyAmount<Currency>
  toChainId: number
}): {
  reqCallBack: () => Promise<string>
} {
  const { account, chainId, library } = useActiveWeb3React()
  const crossContract = useCrossBridgeContract()
  return useMemo(() => {
    if (!callPath || !amount || !toChainId || !destTokenAddr) {
      return {
        reqCallBack: null,
      }
    }

    return {
      reqCallBack: async function onSwap() {
        let _amount = toHex(amount)
        let value = '0x0'
        if (amount.currency.isNative) {
          value = _amount
        }


        try {
          console.log(callPath, destTokenAddr, _amount, toChainId, { value })
          const estimate = await crossContract.estimateGas.swap(callPath, destTokenAddr, _amount, toChainId, { value })
          return crossContract
            .swap(callPath, destTokenAddr, _amount, toChainId, { value, gasLimit: calculateGasMargin(estimate) })
            .then((response: TransactionResponse) => {
              return response.hash
            })
        } catch (e) {
          console.log(e)
        }
        // console.log(crossContract.estimateGas.swap(callPath, destTokenAddr, _amount, toChainId, {value}))
        return ''
      },
    }
  }, [crossContract, callPath, destTokenAddr, amount, toChainId])
}

export function useCrossSwapClaimCallback({
  callPath,
  sourceToken,
  amount,
  fromChain,
  txhash,
  sig,
  decimals,
}: {
  callPath: string[] | undefined
  sourceToken: string
  amount: CurrencyAmount<Currency>
  fromChain: number
  txhash: string
  decimals: number
  sig: { r: string; s: string; v: number }
}): {
  reqCallBack: () => Promise<string>
} {
  const { account, chainId, library } = useActiveWeb3React()
  const crossContract = useCrossBridgeContract()
  const addPopup = useAddPopup()
  return useMemo(() => {
    if (!callPath || !amount || !fromChain || !sourceToken) {
      return {
        reqCallBack: null,
      }
    }

    return {
      reqCallBack: async function onClaim() {
        let _amount = toHex(amount)
        // console.log(account, sourceToken, callPath, _amount, decimals, fromChain, chainId, txhash, sig)
        // addPopup({
        //
        // }, "claim")

        try {
          const estimate = await crossContract.estimateGas.payWithPermit(
            account,
            sourceToken,
            callPath,
            _amount,
            decimals,
            fromChain,
            chainId,
            txhash,
            sig
          )
          // .then((estimate) => {
          //   console.log(estimate.toString())
          crossContract.payWithPermit(
            account,
            sourceToken,
            callPath,
            _amount,
            decimals,
            fromChain,
            chainId,
            txhash,
            sig,
            { gasLimit: calculateGasMargin(estimate) }
          )
        } catch (e) {
          console.error(e, "Estimate Gas Error")
        }

        // console.log(crossContract.estimateGas.swap(callPath, destTokenAddr, _amount, toChainId, {value}))
        return ''
      },
    }
  }, [crossContract, callPath, sourceToken, amount, fromChain])
}
