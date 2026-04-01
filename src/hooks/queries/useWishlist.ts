import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistApi } from '../../api/wishlist.api';
import type { WishlistResponse } from '../../types/api.types';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';

export const wishlistKeys = {
  mine: ['wishlists', 'me'] as const,
};

export const useMyWishlist = () => {
  const isLoggedIn = useAuthStore((s) => !!s.accessToken);
  return useQuery<WishlistResponse>({
    queryKey: wishlistKeys.mine,
    queryFn: () => wishlistApi.getMyList().then(res => res.data),
    enabled: isLoggedIn,
  });
};

export const useAddWishlist = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore(s => s.showToast);
  return useMutation({
    mutationFn: (productId: string) => wishlistApi.add(productId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: wishlistKeys.mine });
      const previous = queryClient.getQueryData<WishlistResponse>(wishlistKeys.mine);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.mine });
      showToast('찜 목록에 추가됐어요.', 'success');
    },
    onError: (_err, _productId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(wishlistKeys.mine, context.previous);
      }
      showToast('찜 추가에 실패했어요. 다시 시도해 주세요.', 'error');
    },
  });
};

export const useRemoveWishlist = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore(s => s.showToast);
  return useMutation({
    mutationFn: (productId: string) => wishlistApi.remove(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: wishlistKeys.mine });
      const previous = queryClient.getQueryData<WishlistResponse>(wishlistKeys.mine);
      if (previous) {
        queryClient.setQueryData<WishlistResponse>(wishlistKeys.mine, {
          ...previous,
          totalCount: Math.max(0, previous.totalCount - 1),
          items: previous.items.filter(item => item.productId !== productId),
        });
      }
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.mine });
      showToast('찜 목록에서 삭제됐어요.', 'success');
    },
    onError: (_err, _productId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(wishlistKeys.mine, context.previous);
      }
      showToast('삭제에 실패했어요. 다시 시도해 주세요.', 'error');
    },
  });
};
