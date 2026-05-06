import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import { getProfileMenuItems } from '../config/menuItems';
import { Role } from '@/types/auth';
import { normalizeAvatarUrl } from '@/utils/avatarUrl';

interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar_url?: string;
  role?: Role;
}

interface ProfileMenuProps {
  user: User;
  mobile?: boolean;
  setLogoutDialogOpen: (open: boolean) => void;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

// Custom Link Component para lidar com casos especiais
const CustomLink = ({
  href,
  onClick,
  children,
  className,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) => {
  if (href === '#' && onClick) {
    return (
      <button onClick={onClick} className={className}>
        {children}
      </button>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
};

export default function ProfileMenu({
  user,
  mobile = false,
  setLogoutDialogOpen,
  setIsMobileMenuOpen,
}: ProfileMenuProps) {
  const { t } = useLanguage('layout');
  const navigate = useNavigate();

  // Função para gerar iniciais do nome do usuário
  const getUserInitials = (name?: string) => {
    if (!name) return t('profile.userInitial');

    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Função para obter nome de exibição do usuário
  const getUserDisplayName = () => {
    if (!user) return t('profile.defaultUser');

    // Verificar diferentes campos de nome disponíveis
    if (user.name) return user.name;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;

    // Fallback para parte do email antes do @
    return user.email.split('@')[0];
  };

  const userName = getUserDisplayName();
  const userEmail = user.email;
  const userInitials = getUserInitials(userName);
  const avatarSrc = normalizeAvatarUrl(user.avatar_url);

  const profileMenuItems = getProfileMenuItems(
    t,
    navigate,
    setLogoutDialogOpen,
  );

  if (mobile) {
    return (
      <div className="p-4 border-t border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-3 p-3 rounded-md bg-sidebar-accent/50">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarSrc} alt={userName} />
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">{userName}</div>
            <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
            {user.role && (
              <div className="text-xs text-sidebar-primary truncate mt-0.5">{user.role.name}</div>
            )}
          </div>
        </div>

        <div className="mt-2 space-y-1">
          {profileMenuItems
            .filter(item => item.name !== t('profile.myProfile')) // Remove "Meu perfil" do mobile
            .map(item => (
              <CustomLink
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </CustomLink>
            ))}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 w-auto px-2 py-2 gap-2 text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarSrc} alt={userName} />
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarSrc} alt={userName} />
              <AvatarFallback className="bg-primary/20 text-primary font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground">{userEmail}</span>
              {user.role && (
                <span className="text-xs text-primary font-medium">{user.role.name}</span>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {profileMenuItems.map(item => (
          <DropdownMenuItem
            key={item.href}
            onClick={() => {
              if (item.onClick) {
                item.onClick();
              } else if (item.href !== '#') {
                navigate(item.href);
              }
            }}
            className="cursor-pointer"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
