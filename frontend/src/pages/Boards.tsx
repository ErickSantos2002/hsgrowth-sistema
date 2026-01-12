import React from "react";
import EmConstrucao from "./EmConstrucao";

const Boards: React.FC = () => {
  return (
    <EmConstrucao
      titulo="Boards"
      descricao="Aqui você poderá gerenciar seus quadros Kanban, criar novos boards, duplicar e organizar seus projetos."
    />
  );
};

export default Boards;
