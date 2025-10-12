import { css } from '@emotion/react';
import { AuthProvider } from './components/auth-provider';
import { SupplyListPage } from './pages/supply-list';
import { Header } from './components/header';

export const App = () => {
  return (
    <div css={mainStyles}>
      <AuthProvider>
        <Header />
        <SupplyListPage />
      </AuthProvider>
    </div>
  );
};

const mainStyles = css`
  max-width: 320px;
  width: 100%;
  * {
    box-sizing: border-box;
  }
`;
