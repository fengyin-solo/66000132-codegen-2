import ArtCanvas from './components/ArtCanvas'
import Sidebar from './components/Sidebar'
import { useDesignStore } from './store/design'

export default function App() {
  const bgMode = useDesignStore(s => s.bgMode)
  return (
    <div className="flex w-full h-full">
      <div
        className={`flex-1 flex items-center justify-center overflow-auto p-6 transition-colors ${
          bgMode === 'dark' ? 'bg-gray-950' : 'bg-gray-200'
        }`}
      >
        <ArtCanvas />
      </div>
      <Sidebar />
    </div>
  )
}
