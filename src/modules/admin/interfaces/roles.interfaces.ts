export interface DomainItem {
  key: string
  label: string
  href: string
  icon: string
}

export interface UsuarioPermiso {
  userId: number
  nombre: string
  email: string
  rol: string
  dominiosPermitidos: string[]
}

export interface RolPermiso {
  rol: string
  nombreRol: string
  dominiosPermitidos: string[]
}
