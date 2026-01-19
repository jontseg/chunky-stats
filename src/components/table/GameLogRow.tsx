"use client";

import { memo } from "react";
import type { Performance, StatType } from "@/lib/types";
import {
  getDefenseRankClass,
  getMatchupRowBgClass,
} from "@/lib/utils/defenseRank";
import {
  isExceptionalPerformance,
  getStatColumnHighlight,
  getStatValueHighlight,
} from "@/lib/utils/statHighlight";

type GameLogRowProps = {
  perf: Performance;
  selectedStat: StatType;
  onClick?: () => void;
};

function GameLogRowComponent({ perf, selectedStat, onClick }: GameLogRowProps) {
  const isExceptional = isExceptionalPerformance(perf);
  const rowBg = getMatchupRowBgClass(perf.opp_pass_def_rank);

  return (
    <tr
      onClick={onClick}
      className={`
        ${rowBg}
        ${isExceptional ? "ring-2 ring-inset ring-accent/50" : ""}
        ${onClick ? "cursor-pointer" : ""}
        hover:brightness-95 dark:hover:brightness-110 transition-all
      `}
    >
      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
        W{perf.week}
        <span className="text-muted text-xs ml-1">
          &apos;{String(perf.season).slice(-2)}
        </span>
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold">
        {perf.opponent.abbreviation}
      </td>
      <td
        className={`px-3 py-3 whitespace-nowrap text-sm ${getDefenseRankClass(
          perf.opp_pass_def_rank
        )}`}
      >
        #{perf.opp_pass_def_rank}
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted">
        {(perf.opp_win_pct * 100).toFixed(0)}%
      </td>
      <td
        className={`px-3 py-3 whitespace-nowrap text-sm text-right ${getStatColumnHighlight(
          "pass_yards",
          selectedStat
        )} ${getStatValueHighlight("pass_yards", perf.pass_yards)}`}
      >
        {perf.pass_yards}
      </td>
      <td
        className={`px-3 py-3 whitespace-nowrap text-sm text-right ${getStatColumnHighlight(
          "pass_tds",
          selectedStat
        )} ${getStatValueHighlight("pass_tds", perf.pass_tds)}`}
      >
        {perf.pass_tds}
      </td>
      <td
        className={`px-3 py-3 whitespace-nowrap text-sm text-right ${getStatColumnHighlight(
          "interceptions",
          selectedStat
        )} ${getStatValueHighlight("interceptions", perf.interceptions)}`}
      >
        {perf.interceptions}
      </td>
      <td
        className={`px-3 py-3 whitespace-nowrap text-sm text-right ${getStatColumnHighlight(
          "rush_yards",
          selectedStat
        )} ${getStatValueHighlight("rush_yards", perf.rush_yards)}`}
      >
        {perf.rush_yards}
      </td>
      <td
        className={`px-3 py-3 whitespace-nowrap text-sm text-right ${getStatColumnHighlight(
          "rush_tds",
          selectedStat
        )} ${getStatValueHighlight("rush_tds", perf.rush_tds)}`}
      >
        {perf.rush_tds}
      </td>
    </tr>
  );
}

export const GameLogRow = memo(GameLogRowComponent);
