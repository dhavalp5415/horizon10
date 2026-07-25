import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import Screener from './pages/Screener'
import Industries from './pages/Industries'
import StockDetail from './pages/StockDetail'
import Compare from './pages/Compare'
import Commodities from './pages/Commodities'
import Legends from './pages/Legends'
import Multibaggers from './pages/Multibaggers'
import Pulse from './pages/Pulse'
import Portfolio from './pages/Portfolio'
import RoundTable from './pages/RoundTable'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Screener /> },
      { path: 'industries', element: <Industries /> },
      { path: 'legends', element: <Legends /> },
      { path: 'multibaggers', element: <Multibaggers /> },
      { path: 'roundtable', element: <RoundTable /> },
      { path: 'pulse', element: <Pulse /> },
      { path: 'portfolio', element: <Portfolio /> },
      { path: 'stock/:ticker', element: <StockDetail /> },
      { path: 'compare', element: <Compare /> },
      { path: 'commodities', element: <Commodities /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
