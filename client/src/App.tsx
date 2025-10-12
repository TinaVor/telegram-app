import { css } from '@emotion/react';
import { LoginCheckProvider } from './components/login-check-provider';
import { SupplyListPage } from './pages/supply-list';

export const App = () => {
  return (
    <div css={mainStyles}>
    <LoginCheckProvider>
      <SupplyListPage />
    </LoginCheckProvider></div>

  );
};

const mainStyles = css`
  max-width: 320px;
  width: 100%;
`;