
export const getIconConfig = (tipo: string) => {
  switch (tipo) {
    case 'CREACION': return { icon: 'add', class: 'icon-creacion' };
    case 'ASIGNACION': return { icon: 'person', class: 'icon-asignacion' };
    case 'ESTADO': return { icon: 'healing', class: 'icon-estado' };
    case 'COMENTARIO': return { icon: 'comment', class: 'icon-comentario' };
    case 'EDICION': return { icon: 'edit', class: 'icon-estado' };
    default: return { icon: 'info', class: 'icon-comentario' };
  }
};