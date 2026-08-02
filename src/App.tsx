import { useEffect } from 'react';
import { SceneCanvas } from './components/SceneCanvas';
import { Hud } from './components/Hud';
import { Toolbar } from './components/Toolbar';
import { PropertyPanel } from './components/PropertyPanel';
import { useShopStore } from './store/shopStore';
import './App.css';

export default function App() {
  const mode = useShopStore((s) => s.mode);
  const darkMode = useShopStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  return (
    <div className={`app mode-${mode}`}>
      <SceneCanvas />
      <Hud />
      <Toolbar />
      <PropertyPanel />
    </div>
  );
}
