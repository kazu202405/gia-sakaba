import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Member } from "@/lib/types";

interface MemberCardProps {
  member: Member;
}

export function MemberCard({ member }: MemberCardProps) {
  return (
    <Link
      href={`/members/${member.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={member.photoUrl}
          alt={member.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
          <p className="text-sm text-white/80">{member.roleTitle} / {member.jobTitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Headline */}
        <p className="text-gray-700 font-medium leading-relaxed mb-4 line-clamp-2">
          {member.headline}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {member.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              {tag.name}
            </Badge>
          ))}
          {member.tags.length > 3 && (
            <Badge
              variant="outline"
              className="text-xs text-gray-400"
            >
              +{member.tags.length - 3}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
