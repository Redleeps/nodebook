import * as React from 'react';

export interface IUserLayoutProps {
    children: React.ReactNode;
}

export default function UserLayout (props: IUserLayoutProps) {
  return (
    <div>
      {props.children}
    </div>
  );
}
