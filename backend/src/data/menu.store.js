/** Dữ liệu thực đơn dùng chung cho API public và admin (memory). */
export const categories = [
  { id: 'cat_water', name: 'Món nước', isActive: true },
  { id: 'cat_rice', name: 'Món cơm', isActive: true },
  { id: 'cat_drink', name: 'Đồ uống', isActive: true },
  { id: 'cat_dessert', name: 'Tráng miệng', isActive: true },
]

export const menuItems = [
  {
    id: 'pho-bo',
    name: 'Phở bò tái',
    categoryId: 'cat_water',
    categoryName: 'Món nước',
    price: 55000,
    imageUrl: '/images/menu/pho.svg',
    isActive: true,
  },
  {
    id: 'bun-cha',
    name: 'Bún chả Hà Nội',
    categoryId: 'cat_water',
    categoryName: 'Món nước',
    price: 65000,
    imageUrl: '/images/menu/buncha.svg',
    isActive: true,
  },
]
