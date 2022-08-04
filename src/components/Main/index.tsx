import ExternalLink from '../ExternalLink'

const Main = ({ children }) => (
  <main className="flex flex-col items-center justify-start flex-grow w-full h-full" style={{ height: 'max-content', backgroundColor: '#181515' }}>
    {children}
  </main >
)

export default Main
