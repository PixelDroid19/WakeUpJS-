/**
 * Crea una simulación completa de React para el entorno de ejecución
 * @returns Objeto React con todos los métodos y componentes necesarios
 */
export const createReactContext = () => {
  const React: any = {
    createElement: (type: any, props: any, ...children: any[]) => {
      return {
        type,
        props: {
          ...props,
          children: children.length === 1 ? children[0] : children,
        },
        $$typeof: Symbol.for("react.element"),
      };
    },
    Fragment: Symbol.for("react.fragment"),

    // Hooks completos
    useState: (initial: any) => {
      let state = initial;
      const setState = (newState: any) => {
        state = typeof newState === "function" ? newState(state) : newState;
        console.log("Estado actualizado:", state);
        return state;
      };
      return [state, setState];
    },

    useEffect: (effect: Function, _deps?: any[]) => {
      console.log("useEffect ejecutado");
      try {
        const cleanup = effect();
        if (typeof cleanup === "function") {
          console.log("useEffect cleanup registrado");
        }
        return cleanup;
      } catch (error) {
        console.error("Error en useEffect:", error);
      }
    },

    useContext: (context: any) => {
      console.log("useContext llamado");
      return context._currentValue || context.defaultValue;
    },

    useReducer: (reducer: Function, initialState: any) => {
      let state = initialState;
      const dispatch = (action: any) => {
        state = reducer(state, action);
        console.log("Estado reducer actualizado:", state);
        return state;
      };
      return [state, dispatch];
    },

    useMemo: (factory: Function, _deps?: any[]) => {
      console.log("useMemo ejecutado");
      return factory();
    },

    useCallback: (callback: Function, _deps?: any[]) => {
      console.log("useCallback ejecutado");
      return callback;
    },

    useRef: (initialValue?: any) => {
      return { current: initialValue };
    },

    // Utilidades adicionales
    createContext: (defaultValue?: any) => {
      return {
        Provider: ({ value, children }: any) => ({
          type: "Provider",
          props: { value, children },
          $$typeof: Symbol.for("react.element"),
        }),
        Consumer: ({ children }: any) => ({
          type: "Consumer",
          props: { children },
          $$typeof: Symbol.for("react.element"),
        }),
        _currentValue: defaultValue,
        defaultValue,
      };
    },
  };

  // Componentes básicos (definidos después de React para evitar referencias circulares)
  React.Component = class Component {
    props: any;
    constructor(props: any) {
      this.props = props;
    }
    render() {
      return null;
    }
  };

  React.PureComponent = class PureComponent extends React.Component {
    shouldComponentUpdate(nextProps: any) {
      // Shallow comparison
      return JSON.stringify(this.props) !== JSON.stringify(nextProps);
    }
  };

  return React;
};

/**
 * Crea el runtime de JSX para React
 * @param React - Instancia de React
 * @returns Objeto con funciones jsx y jsxs
 */
export const createJSXRuntime = (React: any) => ({
  jsx: React.createElement,
  jsxs: React.createElement,
  Fragment: React.Fragment,
}); 