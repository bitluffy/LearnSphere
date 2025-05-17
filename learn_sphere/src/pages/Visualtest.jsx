import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const PhysicsSimulation = () => {
  const sceneRef = useRef(null);
  
  useEffect(() => {
    const { Engine, Render, World, Bodies, Runner } = Matter;
    
    // Create engine
    const engine = Engine.create();
    
    // Create renderer
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: 800,
        height: 600,
        wireframes: false
      }
    });
    
    // Create objects
    const ground = Bodies.rectangle(400, 590, 800, 20, { isStatic: true });
    const ball = Bodies.circle(400, 100, 30);
    
    // Add objects to world
    World.add(engine.world, [ground, ball]);
    
    // Run engine and renderer
    Runner.run(engine);
    Render.run(render);
    
    return () => {
      // Clean up on unmount
      Render.stop(render);
      World.clear(engine.world);
      Engine.clear(engine);
    };
  }, []);
  
  return <div ref={sceneRef} />;
};

export default PhysicsSimulation;
