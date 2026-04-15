from dataclasses import dataclass
from datetime import date


@dataclass
class MineralLicense:
    id                  : str
    type                : str
    country             : str
    regions             : str
    status              : str
    applicants          : list[str]
    application_date    : date
    start_date          : date
    end_date            : date