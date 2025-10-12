import { getInitData } from '../../../utils/get-init-data';
import { authController } from '../../api';

type ILoginCheckProvider = {
  children: React.ReactNode;
};
export const LoginCheckProvider = (props: ILoginCheckProvider) => {
  const initData = getInitData();

  const { isLoading, error } = authController.useCreateOrLoginUser();

  if (!initData) return 'Запускайте из Telegram!';
  if (isLoading) return 'Загрузка...';
  if (error) return 'Ошибка авторизации';

  return <div>{props.children}</div>;
};
