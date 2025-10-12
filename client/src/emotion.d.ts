import '@emotion/react';

declare module '@emotion/react' {
  export interface Theme {
    // Empty theme for now, can be extended later
  }
}

declare global {
  namespace JSX {
    interface Element extends React.JSX.Element {}
    interface ElementClass extends React.Component<any> {}
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }

    interface IntrinsicElements {
      [elemName: string]: any;
    }

    interface IntrinsicClassAttributes<T> extends React.ClassAttributes<T> {}

    interface IntrinsicAttributes extends React.Attributes {}
  }
}

// Add css prop to all HTML elements
declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      css?: import('@emotion/react').SerializedStyles;
    }
  }
}
