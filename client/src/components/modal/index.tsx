import { css } from '@emotion/react';

type IModal = {
  children: React.ReactNode;
  title: string;
  onClose?: () => void;
};

export const Modal = (props: IModal) => {
  const { children, title, onClose } = props;
  return (
    <div css={modalOverlayStyle}>
      <div css={modalStyle}>
        <div css={modalHeaderStyle}>
          <div>{title}</div>
          <button onClick={onClose}>X</button>
        </div>
        <div css={modalContentStyle}>{children}</div>
      </div>
    </div>
  );
};

const modalOverlayStyle = css`
    position: fixed;
    max-width: 320px;
    left; 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    background: rgba(0,0,0,0.3);
`;

const modalStyle = css`
  position: absolute;
  background-color: white;
  borde-radius: 5px;
  width: calc(100% - 40px);
  height: calc(100% - 40px);
  padding: 12px;
  color: black;
  top: 20px;
  left: 20px;
`;

const modalHeaderStyle = css`
  display: flex;
  justify-content: space-between;
  height: 30px;
  padding-bottom: 5px;
  padding-top: 5px;
  border-bottom: 1px solid black;
`;

const modalContentStyle = css``;
