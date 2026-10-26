import React,{createContext,useEffect,useState,useRef,type ReactNode} from 'react';
import {createImageScope,type ImageScope} from './imageResource';
export const ImageScopeContext=createContext<ImageScope | undefined>(undefined);
export function ProductImageScope({children}:{children:ReactNode}) {
  const [scope]=useState(createImageScope);
  const generation=useRef(0);
  useEffect(()=>{
    const current=++generation.current;
    // React's development effect replay must not cancel and restart every photo.
    return ()=>queueMicrotask(()=>{if(generation.current===current)scope.dispose();});
  },[scope]);
  return <ImageScopeContext.Provider value={scope}>{children}</ImageScopeContext.Provider>;
}
