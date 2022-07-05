import { ChainId } from '@sushiswap/sdk'
import NavLink from '../../components/NavLink'
import React from 'react'
import { useActiveWeb3React } from '../../hooks'
import { useWalletModalToggle } from '../../state/application/hooks'

const Menu = ({ positionsLength }) => {
  const { account, chainId } = useActiveWeb3React()
  const toggleWalletModal = useWalletModalToggle()

  return (
    <div className="space-y-4">
      {account ? (
        <NavLink
          exact
          href={`/farm?filter=portfolio`}
          activeClassName="font-bold bg-transparent border rounded text-high-emphesis border-transparent border-gradient-r-blue-pink-dark-900"
        >
          <a className="flex items-center justify-between px-4 py-6 text-base font-bold border border-transparent rounded cursor-pointer bg-white hover:bg-whitesmoke">
            Your Farms
          </a>
        </NavLink>
      ) : (
        <a
          className="striped-background text-secondary flex items-center justify-between px-4 py-6 text-base font-bold border border-transparent rounded cursor-pointer bg-white hover:bg-whitesmoke"
          onClick={toggleWalletModal}
        >
          Your Farms
        </a>
      )}

      <div className="w-full h-0 font-bold bg-transparent border border-b-0 border-transparent rounded text-high-emphesis md:border-gradient-r-blue-pink-dark-800 opacity-20" />

      <NavLink
        exact
        href="/farm"
        activeClassName="font-bold bg-transparent border rounded text-high-emphesis border-transparent border-gradient-r-blue-pink-dark-900"
      >
        <a className="flex items-center justify-between px-4 py-6 text-base font-bold border border-transparent rounded cursor-pointer bg-white hover:bg-whitesmoke">
          All Farms
        </a>
      </NavLink>

      {chainId === ChainId.MAINNET && (
        <>
          <NavLink
            exact
            href={`/farm?filter=kashi`}
            activeClassName="font-bold bg-transparent border rounded text-high-emphesis border-transparent border-gradient-r-blue-pink-dark-900"
          >
            <a className="flex items-center justify-between px-4 py-6 text-base font-bold border border-transparent rounded cursor-pointer bg-white hover:bg-whitesmoke">
              Kashi Farms
            </a>
          </NavLink>
          <NavLink
            exact
            href={`/farm?filter=sushi`}
            activeClassName="font-bold bg-transparent border rounded text-high-emphesis border-transparent border-gradient-r-blue-pink-dark-900"
          >
            <a className="flex items-center justify-between px-4 py-6 text-base font-bold border border-transparent rounded cursor-pointer bg-white hover:bg-whitesmoke">
              HarvestSwap Farms
            </a>
          </NavLink>
        </>
      )}

      {(chainId === ChainId.MAINNET || chainId === ChainId.MATIC) && (
        <NavLink
          exact
          href={`/farm?filter=2x`}
          activeClassName="bg-transparent border rounded text-high-emphesis border-transparent border-gradient-r-blue-pink-dark-900"
        >
          <a className="flex items-center justify-between px-4 py-6 text-base font-bold border border-transparent rounded cursor-pointer bg-white hover:bg-whitesmoke">
            2x Reward Farms
          </a>
        </NavLink>
      )}
    </div>
  )
}

export default Menu
