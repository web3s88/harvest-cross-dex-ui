import React, { useMemo, useState } from 'react'

import { useMoralis, useMoralisQuery } from 'react-moralis'
import { ApprovalState, useActiveWeb3React, useApproveCallback, useTokenBridgeContract } from '../../hooks'
import { splitSignature } from '@ethersproject/bytes'
import { MINTYS_ADDRESS } from '../../constants'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import { ChainId, Currency, CurrencyAmount, toHex } from '@sushiswap/sdk'
import { MINTYS } from '../../config/tokens'
import { tryParseAmount } from '../../functions'
import styled from 'styled-components'
import { Listbox } from '@headlessui/react'
import { NETWORK_ICON } from '../../config/networks'
import { useNetworkModalToggle } from '../../state/application/hooks'
import Container from '../../components/Container'
import Button from '../../components/Button'
import DepositRecord from './DepositRecord'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import { SUPPORTED_NETWORKS } from '../../modals/NetworkModal'

const MintyBridgeBox = styled.div`
  width: 100%;
  max-width: 540px;
  margin-top: 30px;
  border-radius: 24px;
  border: 1px solid #ddd;
  padding: 30px 20px;
  margin-left: auto;
  margin-right: auto;

  select {
    width: 100%;
    padding: 10px;
    border-radius: 10px;
    margin-top: 20px;
    font-weight: 500;
    font-size: 1.2em;
    text-align: center;
  }

  .btn-primary {
    width: 100%;
    font-size: 1.2em;
    font-weight: 500;
    margin-top: 20px;
  }

  .bridge-arrow {
    width: 50px;
    height: 50px;
    display: inline-block;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 5px 0 rgba(0, 0, 0, 0.1);
    position: relative;
    margin-top: -10px;
    margin-bottom: -17px;
    z-index: 2;

    &:before {
      content: '';
      border-left: 2px solid #96ebd3;
      position: absolute;
      left: 50%;
      top: 25%;
      height: 50%;
    }

    &:after {
      content: '';
      width: 8px;
      height: 8px;
      border-right: 2px solid #96ebd3;
      border-bottom: 2px solid #96ebd3;
      position: absolute;
      left: 22px;
      top: 63%;
      transform: rotate(45deg);
    }
  }
`

const TableHeading = styled.h3`
  font-size: 1.5em;
  margin-bottom: 10px;
`

const HistoryTable = styled.table`
  table-layout: auto;
  border: 1px solid #aaa;
  border-radius: 8px;
  overflow: hidden;

  th,
  td {
    padding: 6px 10px;
    line-height: 1.1;
  }

  th {
    text-align: left;
    font-weight: 500;
    background-color: #35c099;
    color: #fff;
  }

  img {
    max-width: 20px !important;
    max-height: 20px !important;
  }

  tr:nth-child(2n + 1) {
    background-color: #eee;
  }
`

const chainIds = [1, 56, 137]

const chains = [
  { id: 1, name: 'ETH' },
  { id: 56, name: 'BSC' },
  { id: 137, name: 'MATIC' },
]

const ChainSelectorWrap = styled.div`
  position: relative;

  button {
    background: #fff;
    width: 100%;
    text-align: left;
    padding: 12px 20px;
    border-radius: 10px;
    font-weight: 500;
    font-size: 1.2em;
    border: 1px solid #ddd;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      width: 10px;
      height: 10px;
      border-left: 2px solid #aaa;
      border-bottom: 2px solid #aaa;
      display: block;
      transform: rotate(-45deg);
      right: 20px;
      top: 20px;
    }
  }

  img {
    width: 26px;
    height: 26px;
    object-fit: contain;
    margin-right: 10px;
    display: inline-block;
    border-radius: 5px;
    overflow: hidden;
    vertical-align: middle;
  }

  ul {
    background: #fff;
    border-radius: 10px;
    position: absolute;
    width: 100%;
    top: 56px;
    font-size: 1.1em;
    z-index: 300;
    overflow: hidden;
    box-shadow: 0 0 10px 0 rgb(0 0 0 / 20%);

    li {
      padding: 10px 20px;
      cursor: pointer;

      &.selected {
        background-color: #f0f0f0;
        pointer-events: none;
      }

      &:hover {
        background-color: #f7f7f7;
      }
    }
  }
`

const ChainSelector = (props) => {
  const { selected, list, onChange, estimate } = props

  return (
    <ChainSelectorWrap>
      <Listbox value={selected} onChange={onChange}>
        <Listbox.Button>
          <img src={NETWORK_ICON[selected.id]} alt={selected.name} />
          {selected.name}
        </Listbox.Button>
        <Listbox.Options>
          {chains.map((item) => (
            <Listbox.Option className={item === selected ? 'selected' : ''} key={item.id} value={item}>
              <img src={NETWORK_ICON[item.id]} alt={item.name} />
              {item.name}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Listbox>
    </ChainSelectorWrap>
  )
}

export default function Bridge(): JSX.Element {
  // const { authenticate, isAuthenticated, user } = useMoralis()

  const { account, chainId, library } = useActiveWeb3React()
  const { data, error, isLoading } = useMoralisQuery(
    'BridgeDeposits',
    (q) => q.equalTo('account', (account || '').toLowerCase()),
    [account],
    {
      live: true,
    }
  )

  const TokenBridge = useTokenBridgeContract()

  // const [mintyFrom, setFrom] = useState<Currency>(MINTYS[chainId])

  const mintyFrom = useMemo(() => {
    return MINTYS[chainId]
  }, [chainId])

  const [fromChain, setFromChain] = useState(chainId)
  const [toChain, setToChain] = useState(chainIds.find((id) => id !== chainId))
  const [inputAmount, setInputAmount] = useState<CurrencyAmount<Currency>>(undefined)

  const toggleNetworkModal = useNetworkModalToggle()

  const [approveState, approve] = useApproveCallback(inputAmount, TokenBridge.address)

  const onSubmit = () => {
    if (fromChain !== chainId) {
      changeNetworkTo(fromChain)
      return
    }

    if (approveState === ApprovalState.APPROVED) {
      TokenBridge.deposit(MINTYS_ADDRESS[chainId], toHex(inputAmount), toChain)
    }
    if (approveState === ApprovalState.NOT_APPROVED) {
      approve()
    }
  }

  const changeNetworkTo = (key) => {
    const params = SUPPORTED_NETWORKS[key]
    if (key === ChainId.MAINNET) {
      library?.send('wallet_switchEthereumChain', [{ chainId: '0x1' }, account])
    } else {
      library?.send('wallet_addEthereumChain', [params, account])
    }
  }

  const handleTypeInput = (value) => {
    setInputAmount(tryParseAmount(value, mintyFrom))
  }


  const mintyBalance = useCurrencyBalance(account, mintyFrom)



  const handleMaxInput = () => {
    setInputAmount(mintyBalance)
  }

  const typeInputAmount = inputAmount?.toExact() ?? ''

  const estimate = inputAmount ? inputAmount.multiply('9604').divide('10000').toFixed(4) : '0'

  const onSelectFrom = (value) => {
    setFromChain(value)
    if (value == toChain) {
      setToChain(chainIds.find((id) => id != value))
    }
  }

  const onSelectTo = (value) => {
    setToChain(value)
    if (value == fromChain) {
      setFromChain(chainIds.find((id) => id != value))
    }
  }

  const DepositRecords = useMemo(() => {
    if (error || isLoading) {
      return null
    }
    return data.map((bdeposit) => {
      const { id, fromChain, toChain, token, amount, sig, payed, transaction_hash } = bdeposit.attributes
      return (
        <DepositRecord
          key={id}
          amount={amount}
          fromChain={fromChain}
          toChain={toChain}
          token={token}
          sig={sig}
          payed={payed}
          txhash={transaction_hash}
        />
        // <tr key={bdeposit.id}>
        //   <td>{bdeposit.get('amount')}</td>
        //   <td>{bdeposit.createdAt.toJSON()}</td>
        //   <td>
        //     <Button className='btn-primary' onClick={() => claim(bdeposit)}>Claim</Button>
        //   </td>
        // </tr>
      )
    })
  }, [error, isLoading, data])

  return (
    <Container id="bridge-page" className="py-4 md:py-8 lg:py-12">
      <MintyBridgeBox>
        <div>
          <CurrencyInputPanel
            showMaxButton={true}
            id="bridge-from-input"
            disableCurrencySelect
            value={typeInputAmount}
            currency={mintyFrom}
            onMax={handleMaxInput}
            onUserInput={handleTypeInput}
          />

          <div>
            <ChainSelector
              selected={chains.find((c) => c.id == fromChain)}
              onChange={(chain) => onSelectFrom(chain.id)}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <span className="bridge-arrow" />
          </div>

          <div>
            <ChainSelector selected={chains.find((c) => c.id == toChain)} onChange={(chain) => onSelectTo(chain.id)}/>
          </div>

          <div className="text-right">
            Estimate ≈ {estimate}
          </div>

          <button className="btn-primary" onClick={onSubmit}>
            {approveState === ApprovalState.APPROVED ? 'Swap' : 'Approve'}
          </button>
        </div>
      </MintyBridgeBox>

      <div className="mt-6">
        <TableHeading className="font-bold">My MintyBridge History</TableHeading>
        <HistoryTable className="w-full">
          <thead>
            <tr>
              <th>From</th>
              <th>Currency</th>
              <th>To</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>{DepositRecords}</tbody>
        </HistoryTable>
      </div>
    </Container>
  )
}
