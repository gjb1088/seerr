import Wrapped from '@app/components/Wrapped';
import useRouteGuard from '@app/hooks/useRouteGuard';
import { Permission } from '@app/hooks/useUser';
import type { NextPage } from 'next';

const UserWrappedPage: NextPage = () => {
  useRouteGuard([Permission.MANAGE_REQUESTS, Permission.REQUEST_VIEW], {
    type: 'or',
  });
  return <Wrapped />;
};

export default UserWrappedPage;
