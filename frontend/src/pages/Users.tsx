import React from "react";
import EmConstrucao from "./EmConstrucao";

const Users: React.FC = () => {
  return (
    <EmConstrucao
      titulo="Usuários"
      descricao="Aqui você poderá gerenciar usuários do sistema, criar novos, editar permissões e controlar acessos. (Apenas Administradores)"
    />
  );
};

export default Users;
