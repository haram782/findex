import type { SpeciesProfile } from "../types";

interface SpeciesProfilePanelProps {
  species: string | undefined;
  aliases: readonly string[];
  profile: SpeciesProfile | null;
  loading: boolean;
  error: string | null;
}

export function SpeciesProfilePanel({
  species,
  aliases,
  profile,
  loading,
  error
}: SpeciesProfilePanelProps) {
  if (loading) {
    return (
      <section className="content-placeholder" role="tabpanel">
        <span className="phase-badge">PHASE 2</span>
        <h3>LLM Wiki</h3>
        <p>어종 정보를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="content-placeholder" role="tabpanel">
        <span className="phase-badge">PHASE 2</span>
        <h3>LLM Wiki</h3>
        <div className="placeholder-card">
          <strong>어종 정보를 불러오지 못했습니다.</strong>
          <span>{error}</span>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="content-placeholder" role="tabpanel">
        <span className="phase-badge">PHASE 2</span>
        <h3>LLM Wiki</h3>
        <p>
          제철, 주요 산지, 특징과 취급 시 주의사항을 출처와 함께 기록할
          예정입니다.
        </p>
        <div className="placeholder-card">
          <strong>{species ?? "선택 어종"} 정보</strong>
          <span>검수된 어종 정보가 아직 없습니다.</span>
          <div className="wiki-aliases">
            <small>다른 이름</small>
            <b>{aliases.length > 0 ? aliases.join(", ") : "등록된 다른 이름 없음"}</b>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content-placeholder species-profile" role="tabpanel">
      <span className="phase-badge">PHASE 2</span>
      <h3>{profile.species} 정보</h3>
      <div className="placeholder-card species-profile-card">
        <dl>
          <dt>제철</dt>
          <dd>{profile.season || "정보 없음"}</dd>
          <dt>주요 산지</dt>
          <dd>
            {profile.mainOrigins.length > 0
              ? profile.mainOrigins.join(", ")
              : "정보 없음"}
          </dd>
          <dt>특징</dt>
          <dd>{profile.features || "정보 없음"}</dd>
          <dt>취급 주의사항</dt>
          <dd>{profile.handlingNotes || "정보 없음"}</dd>
        </dl>
        {profile.sourceUrls.length > 0 && (
          <div className="species-profile-sources">
            <small>출처</small>
            <ul>
              {profile.sourceUrls.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {aliases.length > 0 && (
          <div className="wiki-aliases">
            <small>다른 이름</small>
            <b>{aliases.join(", ")}</b>
          </div>
        )}
      </div>
    </section>
  );
}
