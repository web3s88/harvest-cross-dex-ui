import NavLink from '../../components/NavLink'
import React from 'react'

const Sidebar = ({ items }) => {
  return (
    <div className="mt-4 space-y-4">
      {items.map((item, i) => (
        <NavLink key={i} href={item.href} activeClassName="font-bold text-high-emphesis bg-whitesmoke">
          <a className="flex items-center px-1 py-3 border-transparent rounded hover:bg-white">
            <div className="ml-5">{item.text}</div>
          </a>
        </NavLink>
      ))}
    </div>
  )
}

export default Sidebar
