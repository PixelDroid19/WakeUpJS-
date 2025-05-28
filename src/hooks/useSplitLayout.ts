import { useState, useCallback } from 'react';
import { LAYOUT_CONFIG, STORAGE_KEYS } from '../constants/config';

type Direction = 'horizontal' | 'vertical';
type SplitSizes = [number, number];

interface UseSplitLayoutResult {
  direction: Direction;
  sizes: SplitSizes;
  changeDirection: () => void;
  handleDragEnd: (sizes: number[]) => void;
  gutterSize: number;
}

export const useSplitLayout = (): UseSplitLayoutResult => {
  // Inicializar dirección desde localStorage
  const [direction, setDirection] = useState<Direction>(() => {
    const saved = window.localStorage.getItem(STORAGE_KEYS.SPLIT_DIRECTION);
    return (saved as Direction) || LAYOUT_CONFIG.DEFAULT_DIRECTION;
  });

  // Inicializar tamaños desde localStorage
  const [sizes, setSizes] = useState<SplitSizes>(() => {
    const saved = window.localStorage.getItem(STORAGE_KEYS.SPLIT_SIZES);
    return saved ? JSON.parse(saved) : LAYOUT_CONFIG.DEFAULT_SPLIT_SIZES;
  });

  // Cambiar dirección del split
  const changeDirection = useCallback(() => {
    const newDirection: Direction = direction === 'horizontal' ? 'vertical' : 'horizontal';
    setDirection(newDirection);
    window.localStorage.setItem(STORAGE_KEYS.SPLIT_DIRECTION, newDirection);
    
    // Resetear tamaños al cambiar dirección
    const defaultSizes: SplitSizes = [...LAYOUT_CONFIG.DEFAULT_SPLIT_SIZES];
    setSizes(defaultSizes);
    window.localStorage.setItem(STORAGE_KEYS.SPLIT_SIZES, JSON.stringify(defaultSizes));
  }, [direction]);

  // Manejar fin de arrastre
  const handleDragEnd = useCallback((newSizes: number[]) => {
    const [left, right] = newSizes;
    const sizesArray: SplitSizes = [left, right];
    
    setSizes(sizesArray);
    window.localStorage.setItem(STORAGE_KEYS.SPLIT_SIZES, JSON.stringify(sizesArray));
  }, []);

  return {
    direction,
    sizes,
    changeDirection,
    handleDragEnd,
    gutterSize: LAYOUT_CONFIG.GUTTER_SIZE,
  };
}; 